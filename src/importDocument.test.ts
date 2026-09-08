import { describe, expect, it, vi } from 'vitest';
import { fetchRemoteDocument, getImportUrlFromSearch } from './importDocument';

describe('remote document import', () => {
  it('reads an encoded URL from the query string', () => {
    expect(getImportUrlFromSearch('?url=https%3A%2F%2Fexample.com%2Fserver.yaml')).toBe(
      'https://example.com/server.yaml',
    );
  });

  it('loads a public HTTPS document', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('mcpdesc: 0.8.0', { status: 200 }),
    );

    await expect(fetchRemoteDocument('https://example.com/server.yaml', fetcher))
      .resolves.toBe('mcpdesc: 0.8.0');
    expect(fetcher).toHaveBeenCalledWith(
      new URL('https://example.com/server.yaml'),
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }),
    );
  });

  it('rejects non-HTTPS URLs', async () => {
    await expect(fetchRemoteDocument('http://example.com/server.yaml'))
      .rejects.toThrow('Only HTTPS URLs are supported.');
  });

  it('reports cross-origin network failures', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchRemoteDocument('https://example.com/server.yaml', fetcher))
      .rejects.toThrow('allows browser CORS requests');
  });

  it('rejects responses larger than 1 MiB before reading the body', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('', { status: 200, headers: { 'content-length': '1048577' } }),
    );

    await expect(fetchRemoteDocument('https://example.com/server.yaml', fetcher))
      .rejects.toThrow('exceeds the 1 MiB import limit');
  });
});