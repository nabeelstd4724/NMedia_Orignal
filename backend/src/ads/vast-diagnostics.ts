import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import type { IncomingHttpHeaders } from 'node:http';

const MAX_VAST_BYTES = 512 * 1024;
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;
const MAX_WRAPPER_DEPTH = 5;

export type VastTrackingEvent = 'impression' | 'start' | 'firstQuartile' | 'midpoint' | 'thirdQuartile' | 'complete' | 'click' | 'error';
export type VastHopKind = 'request' | 'redirect' | 'wrapper';

export interface VastDiagnostic {
  code: string;
  message: string;
  level: 'error' | 'warning' | 'info';
}

export interface VastHop {
  url: string;
  kind: VastHopKind;
  status?: number;
  bytes: number;
  contentType?: string;
  location?: string;
}

export interface VastDiagnosticResult {
  ok: boolean;
  source: 'hosted' | 'remote';
  url?: string;
  status?: number;
  contentType?: string;
  bytes: number;
  adCount: number;
  mediaFileCount: number;
  mediaUrls: string[];
  creativeDurationSec?: number;
  trackingEvents: Record<VastTrackingEvent, number>;
  chain: VastHop[];
  diagnostics: VastDiagnostic[];
}

export type Lookup = (hostname: string, options: { all: true; verbatim: true }) => Promise<Array<{ address: string; family: number }>>;
type FetchResponse = { status: number; headers: IncomingHttpHeaders; body: string; bytes: number; location?: string };
export type VastRequester = (rawUrl: string, lookupFn: Lookup, timeoutMs: number) => Promise<FetchResponse & { url: string }>;

const resolveAll: Lookup = (hostname, options) => lookup(hostname, options) as unknown as Promise<Array<{ address: string; family: number }>>;
const emptyTracking = (): Record<VastTrackingEvent, number> => ({ impression: 0, start: 0, firstQuartile: 0, midpoint: 0, thirdQuartile: 0, complete: 0, click: 0, error: 0 });
const diagnostic = (code: string, message: string, level: VastDiagnostic['level'] = 'error'): VastDiagnostic => ({ code, message, level });

function isPrivateIpv4(value: string): boolean {
  const octets = value.split('.').map(Number);
  return octets.length === 4 && (octets[0] === 10 || octets[0] === 127 || (octets[0] === 169 && octets[1] === 254) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168) || octets[0] === 0);
}

function isPrivateAddress(value: string): boolean {
  const normalized = value.replace(/^\[|\]$/g, '').toLowerCase();
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) === 6) return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:') || normalized === '::';
  return false;
}

async function assertSafeRemoteUrl(rawUrl: string, lookupFn: Lookup = resolveAll): Promise<{ url: URL; address: string }> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error('URL_INVALID'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL_PROTOCOL_NOT_ALLOWED');
  if (url.username || url.password) throw new Error('URL_CREDENTIALS_NOT_ALLOWED');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('URL_PORT_NOT_ALLOWED');
  if (url.hostname === 'localhost' || url.hostname.endsWith('.local') || isPrivateAddress(url.hostname)) throw new Error('URL_PRIVATE_HOST_NOT_ALLOWED');
  const addresses = await lookupFn(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((address) => isPrivateAddress(address.address))) throw new Error('URL_PRIVATE_HOST_NOT_ALLOWED');
  return { url, address: addresses[0].address };
}

function decodeXml(value: string): string { return value.replace(/^<!\[CDATA\[/i, '').replace(/\]\]>$/i, '').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").trim(); }
function tagCount(xml: string, tag: string): number { return (xml.match(new RegExp(`<${tag}\\b`, 'gi')) ?? []).length; }
function firstTag(xml: string, tag: string): string | undefined { const match = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')); return match ? decodeXml(match[1]) : undefined; }
function parseDuration(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) return undefined;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4] ?? '0'}`);
}
function trackingCounts(xml: string): Record<VastTrackingEvent, number> {
  const tracking = emptyTracking();
  tracking.impression = tagCount(xml, 'Impression');
  tracking.start = (xml.match(/<Tracking\b[^>]*event=["']start["'][^>]*>/gi) ?? []).length;
  tracking.firstQuartile = (xml.match(/<Tracking\b[^>]*event=["']firstQuartile["'][^>]*>/gi) ?? []).length;
  tracking.midpoint = (xml.match(/<Tracking\b[^>]*event=["']midpoint["'][^>]*>/gi) ?? []).length;
  tracking.thirdQuartile = (xml.match(/<Tracking\b[^>]*event=["']thirdQuartile["'][^>]*>/gi) ?? []).length;
  tracking.complete = (xml.match(/<Tracking\b[^>]*event=["']complete["'][^>]*>/gi) ?? []).length;
  tracking.click = tagCount(xml, 'ClickTracking') + tagCount(xml, 'ClickThrough');
  tracking.error = tagCount(xml, 'Error');
  return tracking;
}

function wrapperUrl(xml: string): string | undefined { return firstTag(xml, 'VASTAdTagURI') ?? firstTag(xml, 'VASTAdTagURL'); }

export function diagnoseVastXml(xml: string, source: 'hosted' | 'remote', url?: string, status?: number, contentType?: string, bytes = Buffer.byteLength(xml), chain: VastHop[] = []): VastDiagnosticResult {
  const diagnostics: VastDiagnostic[] = [];
  const trimmed = xml.trim();
  if (!trimmed) diagnostics.push(diagnostic('VAST_EMPTY', 'The VAST response was empty.'));
  if (!/^<\?xml[\s\S]*?>/i.test(trimmed) && !/^<VAST\b/i.test(trimmed)) diagnostics.push(diagnostic('VAST_XML_DECLARATION_MISSING', 'The response does not start with an XML declaration or VAST root.', 'warning'));
  if (!/<VAST\b[^>]*>/i.test(trimmed)) diagnostics.push(diagnostic('VAST_ROOT_MISSING', 'The response does not contain a VAST root element.'));
  if (/<HTML\b|<!doctype\s+html/i.test(trimmed)) diagnostics.push(diagnostic('VAST_HTML_RESPONSE', 'The endpoint returned HTML instead of VAST XML.'));
  const adCount = tagCount(trimmed, 'Ad');
  const mediaFileCount = tagCount(trimmed, 'MediaFile');
  const mediaUrls = [...trimmed.matchAll(/<MediaFile\b[^>]*>([\s\S]*?)<\/MediaFile>/gi)].map((match) => decodeXml(match[1])).filter(Boolean);
  const creativeDurationSec = parseDuration(firstTag(trimmed, 'Duration'));
  const trackingEvents = trackingCounts(trimmed);
  if (adCount === 0) diagnostics.push(diagnostic('VAST_AD_MISSING', 'The VAST response contains no Ad element.'));
  if (mediaFileCount === 0) diagnostics.push(diagnostic('VAST_MEDIA_FILE_MISSING', 'The VAST response contains no MediaFile element.'));
  if (creativeDurationSec === undefined) diagnostics.push(diagnostic('VAST_DURATION_MISSING', 'The VAST response contains no valid Duration element.'));
  if (trackingEvents.impression === 0) diagnostics.push(diagnostic('VAST_IMPRESSION_MISSING', 'The VAST response contains no Impression element.', 'warning'));
  if (contentType && !/xml|text\/plain/i.test(contentType)) diagnostics.push(diagnostic('VAST_CONTENT_TYPE_UNEXPECTED', `The response content type was ${contentType}.`, 'warning'));
  if (status !== undefined && (status < 200 || status >= 300)) diagnostics.push(diagnostic('VAST_HTTP_STATUS', `The endpoint returned HTTP ${status}.`));
  return { ok: !diagnostics.some((item) => item.level === 'error'), source, ...(url ? { url } : {}), ...(status !== undefined ? { status } : {}), ...(contentType ? { contentType } : {}), bytes, adCount, mediaFileCount, mediaUrls, ...(creativeDurationSec !== undefined ? { creativeDurationSec } : {}), trackingEvents, chain, diagnostics };
}

function requestAtValidatedIp(url: URL, address: string, timeoutMs: number): Promise<FetchResponse> {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const request = transport({ protocol: url.protocol, hostname: address, port: url.port || undefined, path: `${url.pathname}${url.search}`, method: 'GET', headers: { accept: 'application/xml,text/xml;q=0.9,text/plain;q=0.5', host: url.host }, ...(url.protocol === 'https:' ? { servername: url.hostname.replace(/^\[|\]$/g, '') } : {}), timeout: timeoutMs }, (response) => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes <= MAX_VAST_BYTES) chunks.push(chunk); });
      response.on('end', () => { if (bytes > MAX_VAST_BYTES) return reject(new Error('VAST_TOO_LARGE')); resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks).toString('utf8'), bytes, location: typeof response.headers.location === 'string' ? response.headers.location : undefined }); });
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('VAST_TIMEOUT')));
    request.on('error', reject);
    request.end();
  });
}

async function fetchHop(rawUrl: string, lookupFn: Lookup, timeoutMs: number): Promise<FetchResponse & { url: string }> {
  const { url, address } = await assertSafeRemoteUrl(rawUrl, lookupFn);
  const response = await requestAtValidatedIp(url, address, timeoutMs);
  return { ...response, url: url.toString() };
}

export async function fetchAndDiagnoseVast(rawUrl: string, _fetcher?: typeof fetch, lookupFn: Lookup = resolveAll, timeBudgetMs = 10000, requester: VastRequester = fetchHop): Promise<VastDiagnosticResult> {
  const startedAt = Date.now();
  const chain: VastHop[] = [];
  const diagnostics: VastDiagnostic[] = [];
  const seen = new Set<string>();
  let currentUrl = rawUrl;
  let wrapperDepth = 0;
  let redirectCount = 0;
  let finalResult: VastDiagnosticResult | undefined;
  while (true) {
    if (Date.now() - startedAt >= timeBudgetMs) { diagnostics.push(diagnostic('VAST_TIME_BUDGET_EXCEEDED', `VAST traversal exceeded the ${timeBudgetMs}ms time budget.`)); break; }
    let normalized: string;
    try { normalized = (await assertSafeRemoteUrl(currentUrl, lookupFn)).url.toString(); } catch (cause) { const code = cause instanceof Error ? cause.message : 'URL_INVALID'; diagnostics.push(diagnostic(code, `The VAST URL was rejected: ${code}.`)); break; }
    if (seen.has(normalized)) { diagnostics.push(diagnostic('VAST_WRAPPER_LOOP', `VAST wrapper traversal loop detected at ${normalized}.`)); break; }
    seen.add(normalized);
    let response: FetchResponse & { url: string };
    try { response = await requester(normalized, lookupFn, Math.max(1, timeBudgetMs - (Date.now() - startedAt))); } catch (cause) { const code = cause instanceof Error ? cause.message : 'VAST_FETCH_FAILED'; diagnostics.push(diagnostic(code, `The VAST endpoint could not be reached: ${code}.`)); break; }
    chain.push({ url: response.url, kind: wrapperDepth ? 'wrapper' : 'request', status: response.status, bytes: response.bytes, contentType: typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : undefined });
    if (response.status >= 300 && response.status < 400 && response.location) {
      if (redirectCount >= MAX_REDIRECTS) { diagnostics.push(diagnostic('VAST_REDIRECT_LIMIT', `The VAST response exceeded the ${MAX_REDIRECTS}-redirect limit.`)); break; }
      const redirectUrl = new URL(response.location, normalized).toString();
      chain.push({ url: redirectUrl, kind: 'redirect', status: response.status, bytes: response.bytes, contentType: typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : undefined, location: redirectUrl });
      try { await assertSafeRemoteUrl(redirectUrl, lookupFn); } catch (cause) { const code = cause instanceof Error ? cause.message : 'URL_INVALID'; diagnostics.push(diagnostic(code, `Redirect target was rejected: ${code}.`)); break; }
      currentUrl = redirectUrl; redirectCount += 1; continue;
    }
    finalResult = diagnoseVastXml(response.body, 'remote', response.url, response.status, typeof response.headers['content-type'] === 'string' ? response.headers['content-type'] : undefined, response.bytes, chain);
    const nextWrapper = wrapperUrl(response.body);
    if (!nextWrapper) break;
    if (wrapperDepth >= MAX_WRAPPER_DEPTH) { diagnostics.push(diagnostic('VAST_WRAPPER_DEPTH_LIMIT', `The VAST wrapper chain exceeded the ${MAX_WRAPPER_DEPTH}-level limit.`)); break; }
    currentUrl = new URL(nextWrapper, response.url).toString();
    wrapperDepth += 1;
  }
  const base = finalResult ?? { ok: false, source: 'remote' as const, url: rawUrl, bytes: 0, adCount: 0, mediaFileCount: 0, mediaUrls: [], trackingEvents: emptyTracking(), chain: [], diagnostics: [] };
  return { ...base, chain, diagnostics: [...base.diagnostics, ...diagnostics], ok: ![...base.diagnostics, ...diagnostics].some((item) => item.level === 'error') };
}
