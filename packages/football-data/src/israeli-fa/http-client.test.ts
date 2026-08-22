import { describe, expect, it } from 'vitest';
import { IsraeliFaHttpClient, IsraeliFaHttpError } from './http-client.js';

describe('IsraeliFaHttpClient', () => {
  it('returns the response body for a successful request', async () => {
    const calls: string[] = [];
    const client = new IsraeliFaHttpClient(options(), silent, async (url) => {
      calls.push(String(url));
      return new Response('<html>ok</html>', { status: 200 });
    });
    await expect(client.get('/leagues/league/?league_id=40')).resolves.toBe('<html>ok</html>');
    expect(calls).toEqual(['https://www.football.org.il/leagues/league/?league_id=40']);
  });

  it('retries temporary failures with backoff, then succeeds', async () => {
    let attempts = 0;
    const client = new IsraeliFaHttpClient({ ...options(), retryBackoffMs: 1 }, silent, async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('ECONNRESET');
      if (attempts === 2) return new Response('unavailable', { status: 503 });
      return new Response('recovered', { status: 200 });
    });
    await expect(client.get('/x')).resolves.toBe('recovered');
    expect(attempts).toBe(3);
  });

  it('does not retry a 404', async () => {
    let attempts = 0;
    const client = new IsraeliFaHttpClient(options(), silent, async () => {
      attempts += 1;
      return new Response('missing', { status: 404 });
    });
    await expect(client.get('/missing')).rejects.toBeInstanceOf(IsraeliFaHttpError);
    expect(attempts).toBe(1);
  });

  it('does not send a custom bot User-Agent that Cloudflare can fingerprint', async () => {
    let headers: Record<string, string> | undefined;
    const client = new IsraeliFaHttpClient(options(), silent, async (_url, init) => {
      headers = init?.headers as Record<string, string>;
      return new Response('ok', { status: 200 });
    });
    await client.get('/x');
    expect(headers?.['User-Agent']).toBeUndefined();
    expect(JSON.stringify(headers ?? {})).not.toContain('LigatFantasy');
  });
});

const silent = { info() {}, warn() {} };

function options() {
  return { baseUrl: 'https://www.football.org.il', timeoutMs: 1000, requestDelayMs: 0, retryCount: 3, retryBackoffMs: 1 };
}
