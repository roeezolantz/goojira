import { Version3Client, AgileClient } from 'jira.js';
import { getApiToken, getApiTokenStatus } from '../store/secrets';
import { getSettings } from '../store/settings';

interface ClientPair {
  v3: Version3Client;
  agile: AgileClient;
}

let cached: { signature: string; pair: ClientPair } | null = null;

function buildSignature(host: string, email: string, token: string): string {
  return `${host}::${email}::${token.slice(-6)}`;
}

export function getClients(): ClientPair {
  const { baseUrl, email } = getSettings();
  if (!baseUrl) throw new Error('Jira URL is not configured. Open Settings and add it.');
  if (!email) throw new Error('Email is not configured. Open Settings and add it.');

  const status = getApiTokenStatus();
  if (status === 'missing') {
    throw new Error('No API token saved. Paste a token in Settings and click Save.');
  }
  if (status === 'unreadable') {
    throw new Error(
      "Saved token can't be decrypted by either the OS keychain or the machine-bound fallback. In Settings, click Clear next to API Token and re-enter the token.",
    );
  }

  const token = getApiToken();
  if (!token) {
    throw new Error('Token is empty after decryption.');
  }

  const signature = buildSignature(baseUrl, email, token);
  if (cached && cached.signature === signature) return cached.pair;

  const config = {
    host: baseUrl,
    authentication: {
      basic: { email, apiToken: token },
    },
  };
  const pair: ClientPair = {
    v3: new Version3Client(config),
    agile: new AgileClient(config),
  };
  cached = { signature, pair };
  return pair;
}

export function invalidateClients(): void {
  cached = null;
}
