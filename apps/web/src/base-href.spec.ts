import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.html'), 'utf8');

describe('document base href', () => {
  it('loads the app bundle from the origin root when opening /football/squads', () => {
    const href = html.match(/<base\s+href="([^"]+)"/i)?.[1];
    const pageUrl = 'http://localhost:4200/football/squads';
    const base = href ? new URL(href, pageUrl) : new URL(pageUrl);
    expect(new URL('main.js', base).pathname).toBe('/main.js');
  });
});
