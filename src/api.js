export async function apiRequest(path, options = {}) {
  try {
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData) && !headers.has('content-type')) headers.set('content-type', 'application/json');
    const response = await fetch(`/api${path}`, { ...options, headers, credentials: 'same-origin' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { data: null, error: { message: data.error || `Request failed (${response.status}).`, status: response.status } };
    return { data, error: null };
  } catch (error) {
    return { data: null, error: { message: error.message || 'Could not connect to the Cloudflare API.' } };
  }
}

export const jsonBody = value => JSON.stringify(value);
