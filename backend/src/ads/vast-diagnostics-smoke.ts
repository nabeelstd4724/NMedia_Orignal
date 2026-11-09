import assert from 'node:assert/strict';
import { diagnoseVastXml, fetchAndDiagnoseVast, type Lookup, type VastRequester } from './vast-diagnostics.js';

const inlineXml = '<?xml version="1.0"?><VAST version="4.1"><Ad id="cmp"><InLine><Impression>https://example.test/impression</Impression><Error>https://example.test/error</Error><Creatives><Creative><Linear><Duration>00:01:02.500</Duration><TrackingEvents><Tracking event="start">https://example.test/start</Tracking><Tracking event="firstQuartile">https://example.test/q1</Tracking><Tracking event="midpoint">https://example.test/q2</Tracking><Tracking event="thirdQuartile">https://example.test/q3</Tracking><Tracking event="complete">https://example.test/complete</Tracking></TrackingEvents><VideoClicks><ClickThrough>https://example.test/click</ClickThrough><ClickTracking>https://example.test/click-track</ClickTracking></VideoClicks><MediaFiles><MediaFile type="video/mp4">https://cdn.example.test/ad.mp4</MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>';
const wrapper = (url: string) => `<?xml version="1.0"?><VAST version="4.1"><Ad><Wrapper><VASTAdTagURI><![CDATA[${url}]]></VASTAdTagURI><Impression>https://example.test/impression</Impression></Wrapper></Ad></VAST>`;

const valid = diagnoseVastXml(inlineXml, 'hosted');
assert.equal(valid.ok, true);
assert.equal(valid.creativeDurationSec, 62.5);
assert.deepEqual(valid.mediaUrls, ['https://cdn.example.test/ad.mp4']);
assert.deepEqual(valid.trackingEvents, { impression: 1, start: 1, firstQuartile: 1, midpoint: 1, thirdQuartile: 1, complete: 1, click: 2, error: 1 });

const docs = new Map<string, { status: number; body: string; location?: string }>();
const publicAddress = [{ address: '93.184.216.34', family: 4 }];
const privateAddress = [{ address: '10.0.0.7', family: 4 }];
const lookup: Lookup = async (hostname) => hostname === 'private.test' ? privateAddress : publicAddress;
const requester: VastRequester = async (url) => {
  const document = docs.get(url);
  if (!document) throw new Error('MOCK_NOT_FOUND');
  return { url, status: document.status, headers: { 'content-type': 'application/xml', ...(document.location ? { location: document.location } : {}) }, body: document.body, bytes: Buffer.byteLength(document.body), ...(document.location ? { location: document.location } : {}) };
};
const diagnose = (url: string) => fetchAndDiagnoseVast(url, undefined, lookup, 1000, requester);

docs.set('https://root.test/vast', { status: 200, body: wrapper('https://wrapper.test/vast') });
docs.set('https://wrapper.test/vast', { status: 200, body: inlineXml });
const traversed = await diagnose('https://root.test/vast');
assert.equal(traversed.ok, true);
assert.equal(traversed.creativeDurationSec, 62.5);
assert.equal(traversed.chain.length, 2);
assert.deepEqual(traversed.chain.map((hop) => hop.url), ['https://root.test/vast', 'https://wrapper.test/vast']);

docs.set('https://loop.test/vast', { status: 200, body: wrapper('https://loop.test/vast') });
const loop = await diagnose('https://loop.test/vast');
assert.equal(loop.ok, false);
assert.equal(loop.diagnostics.some((item) => item.code === 'VAST_WRAPPER_LOOP'), true);

for (let index = 0; index <= 5; index += 1) docs.set(`https://depth-${index}.test/vast`, { status: 200, body: index === 5 ? wrapper('https://depth-6.test/vast') : wrapper(`https://depth-${index + 1}.test/vast`) });
docs.set('https://depth-6.test/vast', { status: 200, body: inlineXml });
const depth = await diagnose('https://depth-0.test/vast');
assert.equal(depth.ok, false);
assert.equal(depth.diagnostics.some((item) => item.code === 'VAST_WRAPPER_DEPTH_LIMIT'), true);

docs.set('https://private-wrapper-root.test/vast', { status: 200, body: wrapper('http://private.test/vast') });
const privateWrapper = await diagnose('https://private-wrapper-root.test/vast');
assert.equal(privateWrapper.ok, false);
assert.equal(privateWrapper.diagnostics.some((item) => item.code === 'URL_PRIVATE_HOST_NOT_ALLOWED'), true);

docs.set('https://redirect-root.test/vast', { status: 302, body: '', location: 'http://private.test/vast' });
const privateRedirect = await diagnose('https://redirect-root.test/vast');
assert.equal(privateRedirect.ok, false);
assert.equal(privateRedirect.diagnostics.some((item) => item.code === 'URL_PRIVATE_HOST_NOT_ALLOWED'), true);

docs.set('https://redirect-0.test/vast', { status: 301, body: '', location: 'https://redirect-1.test/vast' });
docs.set('https://redirect-1.test/vast', { status: 302, body: '', location: 'https://redirect-2.test/vast' });
docs.set('https://redirect-2.test/vast', { status: 307, body: '', location: 'https://redirect-final.test/vast' });
docs.set('https://redirect-final.test/vast', { status: 200, body: inlineXml });
const redirected = await diagnose('https://redirect-0.test/vast');
assert.equal(redirected.ok, true);
assert.equal(redirected.chain.filter((hop) => hop.kind === 'redirect').length, 3);

const privateDns = await diagnose('https://private.test/vast');
assert.equal(privateDns.ok, false);
assert.equal(privateDns.diagnostics[0]?.code, 'URL_PRIVATE_HOST_NOT_ALLOWED');

console.info('VAST diagnostics smoke test passed: duration/tracking, wrappers, loop/depth limits, redirects and DNS/IP protections.');
