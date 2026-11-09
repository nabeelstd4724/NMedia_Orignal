import { createHmac, timingSafeEqual } from 'node:crypto';

export interface BillingGateway {
  checkout(userId: string, planId: string): Promise<unknown>;
  portal(userId: string): Promise<unknown>;
}

export interface StripeProvider {
  createCheckout(userId: string, planId: string): Promise<{ url: string }>;
  createPortal(userId: string): Promise<{ url: string }>;
}

/** Stripe SDK boundary. The application never imports or requires Stripe directly. */
export class StripeGateway implements BillingGateway {
  constructor(private readonly provider: StripeProvider) {}
  async checkout(userId: string, planId: string): Promise<{ url: string }> { return this.provider.createCheckout(userId, planId); }
  async portal(userId: string): Promise<{ url: string }> { return this.provider.createPortal(userId); }
}

export function verifyStripeSignature(payload: string | Buffer, signature: string, secret: string, toleranceSeconds = 300): boolean {
  const parts = Object.fromEntries(signature.split(',').map((part) => part.split('='))) as Record<string, string>;
  const timestamp = Number(parts.t); const provided = parts.v1;
  if (!Number.isFinite(timestamp) || !provided || Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${typeof payload === 'string' ? payload : payload.toString('utf8')}`).digest('hex');
  const a = Buffer.from(expected, 'utf8'); const b = Buffer.from(provided, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export class InMemoryWebhookRepository {
  private readonly ids = new Set<string>();
  claim(id: string): boolean { if (this.ids.has(id)) return false; this.ids.add(id); return true; }
}

/** Explicit boundary until a payment provider is configured. */
export class ManualGateway implements BillingGateway {
  async checkout(_userId: string, _planId: string): Promise<never> {
    throw Object.assign(new Error('Billing provider is not available'), { statusCode: 501, code: 'NOT_AVAILABLE' });
  }
  async portal(_userId: string): Promise<never> {
    throw Object.assign(new Error('Billing provider is not available'), { statusCode: 501, code: 'NOT_AVAILABLE' });
  }
}
