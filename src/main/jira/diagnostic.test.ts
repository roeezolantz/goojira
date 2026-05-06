import { describe, it, expect } from 'vitest';
import { preflightCheck, deriveHint, extractDiagnostic } from './diagnostic';

describe('preflightCheck', () => {
  it('warns on empty URL', () => {
    expect(preflightCheck('')).toEqual(['Jira URL is empty.']);
    expect(preflightCheck('   ')).toEqual(['Jira URL is empty.']);
  });

  it('warns when missing protocol', () => {
    const warnings = preflightCheck('acme.atlassian.net');
    expect(warnings.some((w) => w.includes('https://'))).toBe(true);
  });

  it('warns when using http://', () => {
    const warnings = preflightCheck('http://acme.atlassian.net');
    expect(warnings.some((w) => w.includes('Cloud requires https://'))).toBe(true);
  });

  it('warns when hostname is not Cloud', () => {
    const warnings = preflightCheck('https://jira.acme.com');
    expect(warnings.some((w) => w.includes('atlassian.net'))).toBe(true);
  });

  it('warns when URL has a path', () => {
    const warnings = preflightCheck('https://acme.atlassian.net/jira/projects');
    expect(warnings.some((w) => w.includes('path'))).toBe(true);
  });

  it('returns no warnings for a clean Cloud URL', () => {
    expect(preflightCheck('https://acme.atlassian.net')).toEqual([]);
    expect(preflightCheck('https://acme.atlassian.net/')).toEqual([]);
  });

  it('handles malformed URLs without throwing', () => {
    const warnings = preflightCheck('https://!!!');
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('deriveHint', () => {
  it('explains 401 as auth failure with token guidance', () => {
    const hint = deriveHint(401, 'Request failed with status code 401');
    expect(hint).toMatch(/token/i);
    expect(hint).toMatch(/id\.atlassian\.com/);
  });

  it('explains 403 as a permission issue', () => {
    const hint = deriveHint(403, '');
    expect(hint).toMatch(/permission/i);
  });

  it('explains 404 as workspace not found', () => {
    const hint = deriveHint(404, '');
    expect(hint).toMatch(/Workspace not found|atlassian\.net/i);
  });

  it('explains 429 as rate limit', () => {
    expect(deriveHint(429, '')).toMatch(/rate.?limit/i);
  });

  it('treats 500-range as Atlassian server error', () => {
    expect(deriveHint(500, '')).toMatch(/server error/i);
    expect(deriveHint(503, '')).toMatch(/server error/i);
  });

  it('detects DNS failures from message text', () => {
    const hint = deriveHint(undefined, 'getaddrinfo ENOTFOUND acme.atlassian.net');
    expect(hint).toMatch(/DNS/i);
  });

  it('detects timeouts', () => {
    expect(deriveHint(undefined, 'connect ETIMEDOUT 1.2.3.4:443')).toMatch(/timeout|firewall/i);
  });

  it('detects TLS interception', () => {
    expect(deriveHint(undefined, 'self signed certificate in certificate chain')).toMatch(
      /certificate|proxy/i,
    );
  });

  it('falls back to a generic hint for unknown errors', () => {
    expect(deriveHint(undefined, 'something weird')).toMatch(/unrecognized|raw details/i);
  });
});

describe('extractDiagnostic', () => {
  it('reads HTTP status and body from a jira.js / axios-shaped error', () => {
    const err = {
      response: {
        status: 401,
        data: { errorMessages: ['Login failed'] },
      },
      config: { url: 'https://acme.atlassian.net/rest/api/3/myself' },
      message: 'Request failed with status code 401',
    };

    const diag = extractDiagnostic(err, 'fallback-url');

    expect(diag.httpStatus).toBe(401);
    expect(diag.url).toBe('https://acme.atlassian.net/rest/api/3/myself');
    expect(diag.responseBody).toContain('Login failed');
    expect(diag.hint).toMatch(/token/i);
  });

  it('falls back to attemptedUrl when error has no config.url', () => {
    const diag = extractDiagnostic(new Error('boom'), 'https://acme.atlassian.net/rest/api/3/myself');
    expect(diag.url).toBe('https://acme.atlassian.net/rest/api/3/myself');
    expect(diag.httpStatus).toBeUndefined();
  });

  it('truncates very long response bodies', () => {
    const big = 'x'.repeat(5000);
    const err = { response: { status: 500, data: big } };
    const diag = extractDiagnostic(err, '');
    expect(diag.responseBody).toContain('truncated');
    expect(diag.responseBody!.length).toBeLessThan(1100);
  });

  it('handles string response bodies without re-stringifying', () => {
    const err = { response: { status: 502, data: 'bad gateway' } };
    const diag = extractDiagnostic(err, '');
    expect(diag.responseBody).toBe('bad gateway');
  });

  it('handles network errors with no response', () => {
    const err = { message: 'getaddrinfo ENOTFOUND acme.atlassian.net' };
    const diag = extractDiagnostic(err, 'https://acme.atlassian.net/rest/api/3/myself');
    expect(diag.httpStatus).toBeUndefined();
    expect(diag.responseBody).toBeUndefined();
    expect(diag.hint).toMatch(/DNS/i);
  });
});
