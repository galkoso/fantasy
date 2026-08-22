import { Impit } from 'impit';

export interface IsraeliFaHttpClientOptions {
  baseUrl: string;
  timeoutMs: number;
  retryCount?: number;
  retryBackoffMs?: number;
  requestDelayMs: number;
  userAgent?: string;
}

export interface IsraeliFaHttpLogger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
}

export type IsraeliFaFetch = (url: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export class IsraeliFaHttpError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'IsraeliFaHttpError';
  }
}

/** Cloudflare blocks Node/curl TLS on HTML pages; Impit impersonates Chrome's TLS fingerprint. */
export function createBrowserFetch(timeoutMs: number): IsraeliFaFetch {
  const impit = new Impit({
    browser: 'chrome',
    timeout: timeoutMs,
    headers: { 'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8' },
  });
  return async (url, init) => {
    const headers = init?.headers as Record<string, string> | undefined;
    return impit.fetch(url, {
      timeout: timeoutMs,
      ...(init?.signal ? { signal: init.signal } : {}),
      ...(headers ? { headers } : {}),
    });
  };
}

export class IsraeliFaHttpClient {
  private lastRequestAt = 0;
  private readonly retryCount: number;
  private readonly retryBackoffMs: number;
  private readonly fetchFn: IsraeliFaFetch;

  constructor(
    private readonly options: IsraeliFaHttpClientOptions,
    private readonly logger: IsraeliFaHttpLogger = { info() {}, warn() {} },
    fetchFn?: IsraeliFaFetch,
  ) {
    this.retryCount = options.retryCount ?? 3;
    this.retryBackoffMs = options.retryBackoffMs ?? 500;
    this.fetchFn = fetchFn ?? createBrowserFetch(options.timeoutMs);
  }

  async get(path: string): Promise<string> {
    const url = new URL(path, this.options.baseUrl).toString();
    await this.throttle();
    let lastError: unknown;
    for (let attempt = 0; attempt < this.retryCount; attempt += 1) {
      try {
        this.logger.info({ path, attempt: attempt + 1 }, 'israeli-fa.request');
        const response = await this.fetchFn(url, {
          headers: requestHeaders(this.options.userAgent),
          signal: AbortSignal.timeout(this.options.timeoutMs),
        });
        if (response.ok) return await response.text();
        if (response.status === 404) throw new IsraeliFaHttpError(`ISRAELI_FA_404 ${path}`, 404);
        if (response.status < 500 && response.status !== 429) {
          throw new IsraeliFaHttpError(`ISRAELI_FA_${response.status} ${path}`, response.status);
        }
        lastError = new IsraeliFaHttpError(`ISRAELI_FA_${response.status} ${path}`, response.status);
        this.logger.warn({ path, status: response.status, attempt: attempt + 1 }, 'israeli-fa.retry');
      } catch (error) {
        if (error instanceof IsraeliFaHttpError && error.status !== undefined && error.status < 500 && error.status !== 429) {
          throw error;
        }
        lastError = error;
        this.logger.warn({ path, attempt: attempt + 1, error: error instanceof Error ? error.message : 'UNKNOWN' }, 'israeli-fa.retry');
      }
      if (attempt < this.retryCount - 1) await sleep(this.retryBackoffMs * 2 ** attempt);
    }
    throw lastError instanceof Error ? lastError : new IsraeliFaHttpError('ISRAELI_FA_RETRY_EXHAUSTED');
  }

  private async throttle(): Promise<void> {
    const wait = this.options.requestDelayMs - (Date.now() - this.lastRequestAt);
    if (wait > 0) await sleep(wait);
    this.lastRequestAt = Date.now();
  }
}

function requestHeaders(userAgent: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  if (userAgent) headers['User-Agent'] = userAgent;
  return headers;
}

const sleep = (milliseconds: number): Promise<void> =>
  milliseconds <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, milliseconds));
