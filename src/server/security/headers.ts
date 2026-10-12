/**
 * Enterprise HTTP Security Headers & Defense-in-Depth Middleware
 * Aligned with OWASP Secure Headers Project & Institutional Banking Standards
 */

import { serverConfig } from "../config";

export function applySecurityHeaders(headers: Headers, requestOrigin?: string | null): Headers {
  // Prevent clickjacking / framing
  headers.set("X-Frame-Options", "DENY");
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  // Prevent MIME type sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // Modern browser XSS filter disablement (preventing selective XSS auditor exploits)
  headers.set("X-XSS-Protection", "0");

  // Strict Referrer Policy
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Hardware & sensor feature isolation
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()",
  );

  // Cross-Origin Isolation
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");

  // HSTS (HTTP Strict Transport Security) - 1 year with subdomains
  if (serverConfig.env === "production") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Cache-Control for sensitive API endpoints
  headers.set("X-Permitted-Cross-Domain-Policies", "none");

  // CORS handling
  if (serverConfig.security.corsEnabled && requestOrigin) {
    const isAllowed =
      serverConfig.security.allowedOrigins.includes(requestOrigin) ||
      requestOrigin.startsWith("http://localhost:") ||
      requestOrigin.startsWith("http://127.0.0.1:");

    if (isAllowed) {
      headers.set("Access-Control-Allow-Origin", requestOrigin);
      headers.set("Access-Control-Allow-Credentials", "true");
      headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
      headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-bullis-api-key, x-request-id, x-client-version",
      );
      headers.set("Access-Control-Max-Age", "86400"); // 24 hours
    }
  }

  return headers;
}
