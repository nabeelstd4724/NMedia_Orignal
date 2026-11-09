import assert from 'node:assert/strict';
import { createAdsService, type AdBeacon } from './adsService';

async function main() {
  const events: AdBeacon[] = [];
  const sent: Array<{ path: string; body: unknown }> = [];
  const service = createAdsService((event) => events.push(event), async (path, body) => { sent.push({ path, body }); return {} as never; });
  await service.beacon({ event: 'impression', campaignId: 'cmp_sandbox', placement: 'preroll' });
  assert.equal(events[0]?.event, 'impression');
  assert.equal(sent[0]?.path, '/ads/events');
  assert.equal((sent[0]?.body as { campaignId: string }).campaignId, 'cmp_sandbox');
  console.info('Ads sandbox beacon smoke test passed: observer and real event sender path.');
}
void main();
