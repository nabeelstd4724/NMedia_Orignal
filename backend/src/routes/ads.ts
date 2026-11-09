import type { FastifyInstance } from 'fastify';
import { authenticatedUser } from '../auth/routes.js';
import type { AuthRepository } from '../auth/repository.js';
import type { SubscriptionRepository } from '../entitlement/repository.js';
import type { AppConfig } from '../config/env.js';
import { AdService } from '../ads/service.js';
import type { AdPlacement, AdRepository } from '../ads/repository.js';

export async function adRoutes(app: FastifyInstance, repository: AdRepository, auth: AuthRepository, subscriptions: SubscriptionRepository, config: AppConfig): Promise<void> {
  const service = new AdService(repository);
  app.get<{ Querystring: { placement?: AdPlacement } }>('/api/v1/ads/config', { schema: { querystring: { type: 'object', required: ['placement'], additionalProperties: false, properties: { placement: { type: 'string', enum: ['preroll', 'midroll'] } } } } }, async (request, reply) => {
    const placement = request.query.placement!;
    const user = await authenticatedUser(request, auth, config);
    const subscription = user ? await subscriptions.findByUserId(user.id) : null;
    const subscriber = subscription?.status === 'active' || (subscription?.status === 'past_due' && subscription.currentPeriodEndsAt + config.pastDueGraceDays * 86400000 > Date.now());
    const selected = subscriber ? null : await service.select(placement, user?.id ?? request.ip);
    return { data: { ...(await service.settings()), placement, selected } };
  });
  app.get<{ Params: { campaignId: string } }>('/api/v1/ads/vast/:campaignId', { schema: { params: { type: 'object', required: ['campaignId'], properties: { campaignId: { type: 'string', pattern: '^[A-Za-z0-9_-]+$' } } } } }, async (request, reply) => {
    const campaign = await service.getCampaign(request.params.campaignId);
    if (!campaign) return reply.code(404).send({ error: { code: 'CAMPAIGN_NOT_FOUND', message: 'Ad campaign was not found' } });
    if (campaign.kind === 'third_party' && campaign.vastTagUrl) return { data: { campaignId: campaign.id, vastTagUrl: campaign.vastTagUrl } };
    return reply.type('application/xml; charset=utf-8').send(service.toVast(campaign));
  });
  app.post<{ Body: { eventId: string; sessionKey: string; campaignId: string; event: string; occurredAt?: string; errorCode?: string; errorMessage?: string } }>('/api/v1/ads/events', { schema: { body: { type: 'object', required: ['eventId', 'sessionKey', 'campaignId', 'event'], additionalProperties: false, properties: { eventId: { type: 'string', minLength: 1, maxLength: 128 }, sessionKey: { type: 'string', minLength: 1, maxLength: 128 }, campaignId: { type: 'string', minLength: 1, maxLength: 100 }, event: { type: 'string', enum: ['impression', 'start', 'quartile', 'complete', 'skip', 'click', 'error'] }, occurredAt: { type: 'string', format: 'date-time' }, errorCode: { type: 'string', minLength: 1, maxLength: 80 }, errorMessage: { type: 'string', maxLength: 500 } } } } }, async (request, reply) => {
    if (!(await service.hasCampaign(request.body.campaignId))) return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'campaignId is invalid' } });
    const result = await service.recordEvent({ ...request.body, event: request.body.event as 'impression' | 'start' | 'quartile' | 'complete' | 'skip' | 'click' | 'error', occurredAt: request.body.occurredAt ?? new Date().toISOString() });
    return reply.code(result.duplicate ? 200 : 202).send({ data: result });
  });
}
