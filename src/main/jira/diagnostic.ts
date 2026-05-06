import type { ConnectionDiagnostic } from '@shared/types';

const MAX_BODY_CHARS = 1000;

export function preflightCheck(baseUrl: string): string[] {
  const warnings: string[] = [];
  const trimmed = baseUrl.trim();

  if (!trimmed) {
    warnings.push('Jira URL is empty.');
    return warnings;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    warnings.push('URL must start with https:// (e.g., https://your-domain.atlassian.net).');
  } else if (/^http:\/\//i.test(trimmed)) {
    warnings.push('URL uses http://; Atlassian Cloud requires https://.');
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    warnings.push('URL is malformed.');
    return warnings;
  }

  if (!parsed.hostname.endsWith('.atlassian.net')) {
    warnings.push(
      `Hostname "${parsed.hostname}" doesn't end in .atlassian.net. goojira currently only supports Jira Cloud — Server / Data Center is not supported.`,
    );
  }

  if (parsed.pathname && parsed.pathname !== '/' && parsed.pathname !== '') {
    warnings.push(
      `URL has a path ("${parsed.pathname}"). Use the workspace origin only — e.g., https://your-domain.atlassian.net.`,
    );
  }

  return warnings;
}

export function deriveHint(httpStatus: number | undefined, message: string): string {
  if (httpStatus === 401) {
    return 'Authentication rejected. The email + token combination is invalid. Most common causes: token revoked, token belongs to a different account than the email entered, or email typo. Generate a fresh token at id.atlassian.com/manage-profile/security/api-tokens.';
  }
  if (httpStatus === 403) {
    return 'Authentication succeeded but the account lacks permission for this workspace. The token owner must be added as a member of the Jira site, or use a different token.';
  }
  if (httpStatus === 404) {
    return 'Workspace not found. Double-check the URL — should look like https://your-domain.atlassian.net with no path.';
  }
  if (httpStatus === 429) {
    return 'Atlassian is rate-limiting requests. Wait a minute and try again.';
  }
  if (httpStatus !== undefined && httpStatus >= 500) {
    return `Atlassian returned a server error (HTTP ${httpStatus}). Check status.atlassian.com — usually transient.`;
  }
  if (/ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return 'DNS lookup failed. Check the hostname spelling and your internet connection.';
  }
  if (/ECONNREFUSED/i.test(message)) {
    return 'Connection refused. The server isn\'t accepting connections on the expected port.';
  }
  if (/ETIMEDOUT|ECONNRESET/i.test(message)) {
    return 'Network timeout or connection dropped. May be a firewall, VPN, or proxy issue.';
  }
  if (/certificate|SELF_SIGNED|UNABLE_TO_VERIFY/i.test(message)) {
    return 'TLS certificate error — likely a corporate proxy intercepting HTTPS traffic.';
  }
  return 'Connection failed for an unrecognized reason. See the response body and recent API log for raw details.';
}

export function extractDiagnostic(error: unknown, attemptedUrl: string): ConnectionDiagnostic {
  // jira.js wraps axios errors. Shape we can rely on:
  //   error.response.status         -> HTTP status
  //   error.response.data           -> response body (string or JSON)
  //   error.config.url              -> the URL that was attempted
  //   error.message                 -> top-level message
  // For network errors there's no .response.
  const e = error as {
    response?: { status?: number; data?: unknown };
    config?: { url?: string };
    message?: string;
  };

  const httpStatus = e?.response?.status;
  const data = e?.response?.data;
  let responseBody: string | undefined;
  if (data != null) {
    try {
      responseBody = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    } catch {
      responseBody = String(data);
    }
    if (responseBody.length > MAX_BODY_CHARS) {
      responseBody = responseBody.slice(0, MAX_BODY_CHARS) + '… (truncated)';
    }
  }

  const url = e?.config?.url ?? attemptedUrl;
  const message = e?.message ?? String(error);
  const hint = deriveHint(httpStatus, message);

  return { url, httpStatus, responseBody, hint };
}
