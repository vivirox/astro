import { defineMiddleware, sequence } from "astro:middleware";
import { corsMiddleware } from "./cors";
import { rateLimitMiddleware } from "./rate-limit";
import { loggingMiddleware } from "./logging";

/**
 * Apply security headers to all responses
 * Based on best practices and penetration testing results
 */
const securityHeadersMiddleware = defineMiddleware(async (context, next) => {
  // Process the request first
  const response = await next();

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // Set Content-Security-Policy
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' https://api.together.xyz; " +
      "img-src 'self' data: blob:; " +
      "style-src 'self' 'unsafe-inline'; " +
      "font-src 'self'; " +
      "frame-src 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self';",
  );

  return response;
});

/**
 * Apply middleware in the correct sequence:
 * 1. Logging - track all requests with request IDs
 * 2. CORS - handle preflight requests
 * 3. Rate Limiting - protect against abuse
 * 4. Security Headers - apply to all responses
 */
export const onRequest = sequence(
  loggingMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  securityHeadersMiddleware,
);
