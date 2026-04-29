import { Version3Client, AgileClient } from 'jira.js';
import { getApiToken } from '../store/secrets';
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
  const token = getApiToken();
  if (!baseUrl || !email || !token) {
    throw new Error('Jira is not configured. Open Settings and add URL, email, and API token.');
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
