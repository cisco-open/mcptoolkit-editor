export const MAX_IMPORT_BYTES = 1024 * 1024;

export function getImportUrlFromSearch(search: string): string {
  return new URLSearchParams(search).get('url')?.trim() ?? '';
}

export async function fetchRemoteDocument(
  value: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter a valid absolute URL.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are supported.');
  }

  let response: Response;
  try {
    response = await fetcher(url, {
      credentials: 'omit',
      headers: { Accept: 'application/json, application/yaml, text/yaml, text/plain' },
      referrerPolicy: 'no-referrer',
    });
  } catch {
    throw new Error('Unable to load this URL. Confirm that it is public and allows browser CORS requests.');
  }

  if (!response.ok) {
    throw new Error(`Unable to load this URL (HTTP ${response.status}).`);
  }

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMPORT_BYTES) {
    throw new Error('The document exceeds the 1 MiB import limit.');
  }

  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    throw new Error('The document exceeds the 1 MiB import limit.');
  }
  return text;
}