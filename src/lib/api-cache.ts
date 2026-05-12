/**
 * HTTP cache header helpers for API route responses.
 *
 * Sets Cache-Control so Vercel's Edge Network (and compatible CDNs) can cache
 * responses, dramatically reducing server load and third-party API calls.
 *
 * s-maxage      = shared/CDN cache TTL
 * max-age       = browser cache TTL (we keep this short or omit it)
 * stale-while-revalidate = serve stale data while refreshing in background
 */

/**
 * Return a JSON Response with CDN cache headers.
 *
 * @param data                     Response body
 * @param maxAgeSeconds            How long the CDN caches (s-maxage)
 * @param staleWhileRevalidate     How long to serve stale while revalidating
 */
export function cacheableJson(
  data: unknown,
  maxAgeSeconds: number,
  staleWhileRevalidateSeconds: number,
): Response {
  return Response.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
    },
  });
}

/**
 * Add cache headers to an existing Response.
 */
export function addCacheHeaders(
  response: Response,
  maxAgeSeconds: number,
  staleWhileRevalidateSeconds: number,
): Response {
  response.headers.set(
    "Cache-Control",
    `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
  );
  return response;
}
