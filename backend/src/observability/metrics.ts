export interface Metrics {
  requests: number;
  errors: number;
  durationsMs: number;
  byRoute: Map<string, { requests: number; errors: number; durationsMs: number }>;
}

export function createMetrics(): Metrics {
  return { requests: 0, errors: 0, durationsMs: 0, byRoute: new Map() };
}

export function recordRequest(metrics: Metrics, route: string, durationMs: number, statusCode: number): void {
  const entry = metrics.byRoute.get(route) ?? { requests: 0, errors: 0, durationsMs: 0 };
  entry.requests += 1;
  entry.durationsMs += durationMs;
  if (statusCode >= 500) { entry.errors += 1; metrics.errors += 1; }
  metrics.requests += 1;
  metrics.durationsMs += durationMs;
  metrics.byRoute.set(route, entry);
}

export function renderPrometheus(metrics: Metrics): string {
  const lines = [
    '# HELP nmedia_http_requests_total Total HTTP requests handled.',
    '# TYPE nmedia_http_requests_total counter',
    `nmedia_http_requests_total ${metrics.requests}`,
    '# HELP nmedia_http_errors_total Total HTTP 5xx responses.',
    '# TYPE nmedia_http_errors_total counter',
    `nmedia_http_errors_total ${metrics.errors}`,
    '# HELP nmedia_http_request_duration_ms_total Sum of request durations in milliseconds.',
    '# TYPE nmedia_http_request_duration_ms_total counter',
    `nmedia_http_request_duration_ms_total ${metrics.durationsMs.toFixed(3)}`,
  ];
  for (const [route, value] of metrics.byRoute) {
    const label = route.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    lines.push(`nmedia_http_route_requests_total{route="${label}"} ${value.requests}`);
    lines.push(`nmedia_http_route_errors_total{route="${label}"} ${value.errors}`);
  }
  return `${lines.join('\n')}\n`;
}
