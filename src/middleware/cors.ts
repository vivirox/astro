import { defineMiddleware } from "astro:middleware";

/**
 * CORS configuration options
 */
export const corsOptions = {
  allowedOrigins: [
    "http://localhost:3000",
    "http://localhost:8080",
    "https://*.yourdomain.com",
  ],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  exposedHeaders: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],
  maxAge: 86400, // 24 hours
  credentials: true,
};

/**
 * CORS middleware
 * Adds proper CORS headers for API requests based on restrictive policy
 */
export const corsMiddleware = defineMiddleware(async ({ request }, next) => {
  // Only apply CORS to API routes
  if (!request.url.includes("/api/")) {
    return next();
  }

  const origin = request.headers.get("Origin");

  // Process the request
  const response = await next();

  // Apply CORS headers if origin is present
  if (origin) {
    // Check if origin is allowed
    const isAllowed = corsOptions.allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin.includes("*")) {
        const pattern = new RegExp(
          "^" + allowedOrigin.replace("*", ".*") + "$",
        );
        return pattern.test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      response.headers.set("Access-Control-Allow-Origin", origin);

      if (corsOptions.credentials) {
        response.headers.set("Access-Control-Allow-Credentials", "true");
      }

      // Handle preflight requests
      if (request.method === "OPTIONS") {
        response.headers.set(
          "Access-Control-Allow-Methods",
          corsOptions.allowedMethods.join(", "),
        );
        response.headers.set(
          "Access-Control-Allow-Headers",
          corsOptions.allowedHeaders.join(", "),
        );
        response.headers.set(
          "Access-Control-Max-Age",
          corsOptions.maxAge.toString(),
        );

        if (corsOptions.exposedHeaders.length > 0) {
          response.headers.set(
            "Access-Control-Expose-Headers",
            corsOptions.exposedHeaders.join(", "),
          );
        }

        // Return 204 No Content for preflight requests
        return new Response(null, {
          status: 204,
          headers: response.headers,
        });
      }

      // Add exposed headers for non-preflight requests
      if (corsOptions.exposedHeaders.length > 0) {
        response.headers.set(
          "Access-Control-Expose-Headers",
          corsOptions.exposedHeaders.join(", "),
        );
      }
    }
  }

  return response;
});
