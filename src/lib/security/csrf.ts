import type { AstroCookies } from 'astro';
import { randomBytes, createHash } from 'crypto';

// Constants
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_TOKEN_LENGTH = 32; // 256 bits
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Interface for token data
interface CsrfTokenData {
  token: string;
  expires: number;
}

/**
 * Generate a secure random token for CSRF protection
 */
function generateSecureToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Create a hash of the token to store in the cookie
 * This prevents the raw token from being accessible client-side
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a new CSRF token and store it in a cookie
 * 
 * @param cookies Astro cookies object
 * @returns The raw CSRF token to be sent in forms
 */
export function generateCsrfToken(cookies: AstroCookies): string {
  const token = generateSecureToken();
  const hashedToken = hashToken(token);
  
  // Store token data in cookie
  const tokenData: CsrfTokenData = {
    token: hashedToken,
    expires: Date.now() + CSRF_TOKEN_EXPIRY
  };
  
  // Set the cookie with security options
  cookies.set(CSRF_COOKIE_NAME, JSON.stringify(tokenData), {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY / 1000 // Convert to seconds
  });
  
  return token;
}

/**
 * Validate a CSRF token against the stored cookie value
 * 
 * @param cookies Astro cookies object
 * @param token The token to validate (from form or header)
 * @returns Boolean indicating if the token is valid
 */
export function validateCsrfToken(cookies: AstroCookies, token: string | null): boolean {
  if (!token) {
    return false;
  }
  
  // Get the token data from cookie
  const tokenDataStr = cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!tokenDataStr) {
    return false;
  }
  
  try {
    const tokenData = JSON.parse(tokenDataStr) as CsrfTokenData;
    
    // Check if token has expired
    if (tokenData.expires < Date.now()) {
      return false;
    }
    
    // Compare the hashed token
    const hashedToken = hashToken(token);
    return tokenData.token === hashedToken;
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return false;
  }
}

/**
 * Middleware to validate CSRF tokens for API requests
 * 
 * @param request The incoming request
 * @returns Response object if validation fails, undefined if successful
 */
export function csrfProtection(request: Request, cookies: AstroCookies): Response | undefined {
  // Skip for GET, HEAD, OPTIONS requests (safe methods)
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return undefined;
  }
  
  // Check for token in header
  const token = request.headers.get(CSRF_HEADER_NAME);
  
  // Validate the token
  if (!validateCsrfToken(cookies, token)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing CSRF token' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return undefined;
}

/**
 * Get the CSRF token header name for client-side code
 */
export function getCsrfHeaderName(): string {
  return CSRF_HEADER_NAME;
}