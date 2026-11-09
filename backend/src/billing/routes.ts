import type { FastifyInstance, FastifyReply } from 'fastify';
import { authenticatedUser } from '../auth/routes.js';
import type { AuthRepository } from '../auth/repository.js';
import type { AppConfig } from '../config/env.js';
import type { SubscriptionRepository } from '../entitlement/repository.js';
import type { PlanRepository } from './plans.js';
import type { BillingGateway } from './gateway.js';
import type { Plan, SubscriptionView } from '../../../contracts/src/index.js';
import type { AuditRepository } from '../admin/audit.js';
import { normalizeAccountRole } from '../auth/repository.js';
import { InMemoryWebhookRepository, verifyStripeSignature } from './gateway.js';

const planBody = { type: 'object', additionalProperties: false, required: ['planId'], properties: { planId: { type: 'string', minLength: 1, maxLength: 64 } } } as const;
const userBody = { type: 'object', additionalProperties: false, required: ['userId'], properties: { userId: { type: 'string', minLength: 1, maxLength: 128 }, planId: { type: 'string', minLength: 1, maxLength: 64 }, durationDays: { type: 'integer', minimum: 1, maximum: 730 } } } as const;
const publicSubscription = (plan: Plan, record?: { status: 'active' | 'past_due' | 'canceled'; currentPeriodEndsAt: number; source?: 'manual' | 'provider' }): SubscriptionView => ({ plan, status: record?.status ?? 'active', currentPeriodEndsAt: record ? new Date(record.currentPeriodEndsAt).toISOString() : null, source: record?.source ?? 'free' });
const unauthenticated = (reply: FastifyReply) => reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } });

export async function billingRoutes(app: FastifyInstance, auth: AuthRepository, subscriptions: SubscriptionRepository, plans: PlanRepository, gateway: BillingGateway, config: AppConfig, audit?: AuditRepository): Promise<void> {
  const webhooks = new InMemoryWebhookRepository();
  app.get('/api/v1/plans', async (_request, reply) => reply.send({ data: { plans: await plans.listActive() } }));
  app.get('/api/v1/me/subscription', async (request, reply) => {
    const user = await authenticatedUser(request, auth, config); if (!user) return unauthenticated(reply);
    const record = await subscriptions.findByUserId(user.id); const plan = await plans.findById(record?.planId ?? 'free');
    return reply.send({ data: { subscription: publicSubscription(plan!, record ?? undefined) } });
  });
  app.post<{ Body: { planId: string } }>('/api/v1/billing/checkout', { schema: { body: planBody } }, async (request, reply) => {
    const user = await authenticatedUser(request, auth, config); if (!user) return unauthenticated(reply);
    if (!await plans.findById(request.body.planId)) return reply.code(404).send({ error: { code: 'PLAN_NOT_FOUND', message: 'Plan was not found' } });
    return gateway.checkout(user.id, request.body.planId);
  });
  app.post('/api/v1/billing/portal', async (request, reply) => { const user = await authenticatedUser(request, auth, config); if (!user) return unauthenticated(reply); return gateway.portal(user.id); });
  app.post<{ Body: { id?: string; type?: string; data?: { object?: { metadata?: { userId?: string; planId?: string } } } } }>('/api/v1/billing/webhooks/stripe', async (request, reply) => {
    if (!config.stripeWebhookSecret) return reply.code(501).send({ error: { code: 'NOT_AVAILABLE', message: 'Stripe webhooks are not configured' } });
    const signature = request.headers['stripe-signature']; if (typeof signature !== 'string') return reply.code(400).send({ error: { code: 'INVALID_SIGNATURE', message: 'Stripe signature is required' } });
    const payload = JSON.stringify(request.body); if (!verifyStripeSignature(payload, signature, config.stripeWebhookSecret)) return reply.code(400).send({ error: { code: 'INVALID_SIGNATURE', message: 'Stripe signature is invalid' } });
    if (!request.body.id || !webhooks.claim(request.body.id)) return reply.send({ data: { received: true, duplicate: true } });
    if (request.body.type === 'customer.subscription.deleted' && request.body.data?.object?.metadata?.userId) await subscriptions.revoke(request.body.data.object.metadata.userId);
     if (request.body.type === 'customer.subscription.created' && request.body.data?.object?.metadata?.userId) await subscriptions.grant(request.body.data.object.metadata.userId, { status: 'active', source: 'provider', planId: request.body.data.object.metadata.planId });
    await audit?.append({ actorId: 'stripe', action: 'stripe.webhook', targetType: 'stripe_event', targetId: request.body.id, metadata: { type: request.body.type ?? 'unknown' } });
    return reply.send({ data: { received: true, duplicate: false } });
  });
   app.post<{ Body: { userId: string; planId?: string; durationDays?: number } }>('/api/v1/admin/subscriptions/grant', { schema: { body: userBody } }, async (request, reply) => {
     const admin = await authenticatedUser(request, auth, config); if (!admin) return unauthenticated(reply); if (normalizeAccountRole(admin.role) !== 'super_admin') return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Super-admin access is required' } });
    const target = await auth.findUserById(request.body.userId); if (!target) return reply.code(404).send({ error: { code: 'USER_NOT_FOUND', message: 'User was not found' } });
    const planId = request.body.planId ?? 'premium-monthly'; if (!await plans.findById(planId)) return reply.code(404).send({ error: { code: 'PLAN_NOT_FOUND', message: 'Plan was not found' } });
     const durationDays = request.body.durationDays ?? 30;
     const subscription = await subscriptions.grant(target.id, { status: 'active', planId, source: 'manual', currentPeriodEndsAt: Date.now() + durationDays * 24 * 60 * 60 * 1000 });
    await audit?.append({ actorId: admin.id, action: 'subscription.grant', targetType: 'user', targetId: target.id, metadata: { planId } });
    return reply.code(201).send({ data: { subscription: publicSubscription((await plans.findById(planId))!, subscription), audit: { actorId: admin.id, action: 'subscription.grant', targetUserId: target.id } } });
  });
  app.post<{ Body: { userId: string } }>('/api/v1/admin/subscriptions/revoke', { schema: { body: userBody } }, async (request, reply) => {
     const admin = await authenticatedUser(request, auth, config); if (!admin) return unauthenticated(reply); if (normalizeAccountRole(admin.role) !== 'super_admin') return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Super-admin access is required' } });
    if (!await auth.findUserById(request.body.userId)) return reply.code(404).send({ error: { code: 'USER_NOT_FOUND', message: 'User was not found' } });
     await subscriptions.revoke(request.body.userId); await audit?.append({ actorId: admin.id, action: 'subscription.revoke', targetType: 'user', targetId: request.body.userId }); return reply.send({ data: { revoked: true, audit: { actorId: admin.id, action: 'subscription.revoke', targetUserId: request.body.userId } } });
  });
}
