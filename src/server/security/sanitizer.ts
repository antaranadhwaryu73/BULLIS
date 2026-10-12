/**
 * Defensive Input Sanitization & Payload Protection
 * Protects against Prototype Pollution, Memory Exhaustion, and Injection vectors
 */

import { serverConfig } from "../config";

export class ApiSecurityError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiSecurityError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sanitizeInputString(val: string): string {
  // Strip control characters & null bytes
  // eslint-disable-next-line no-control-regex
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

export function detectSuspiciousPatterns(text: string): boolean {
  // Look for path traversal (raw and encoded)
  if (text.includes("..") || /%2e%2e/i.test(text) || /\.\.[/\\]/.test(text)) return true;
  // Look for obvious script injection tags
  if (/<script\b[^>]*>([\s\S]*?)<\/script>/gi.test(text)) return true;
  return false;
}

export async function parseAndSanitizeJson<T = unknown>(request: Request): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > serverConfig.security.maxBodySizeBytes) {
    throw new ApiSecurityError(
      413,
      "PAYLOAD_TOO_LARGE",
      `Payload exceeds maximum allowed size of ${serverConfig.security.maxBodySizeBytes} bytes`,
    );
  }

  const rawText = await request.text();
  if (rawText.length > serverConfig.security.maxBodySizeBytes) {
    throw new ApiSecurityError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds buffer threshold");
  }

  if (!rawText.trim()) {
    return {} as T;
  }

  // Defend against prototype pollution
  if (
    rawText.includes('"__proto__"') ||
    rawText.includes('"constructor"') ||
    rawText.includes('"prototype"')
  ) {
    throw new ApiSecurityError(
      400,
      "PROTOTYPE_POLLUTION_DETECTED",
      "Malicious object keys detected in JSON body",
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new ApiSecurityError(400, "INVALID_JSON", "Malformed JSON syntax");
  }
}

/**
 * Creates an RFC 7807 compliant Problem Details Response
 */
export function createProblemDetailsResponse(
  status: number,
  title: string,
  detail: string,
  instance: string,
  invalidParams?: unknown,
): Response {
  const body = {
    type: `https://bullis.internal/errors/${status}`,
    title,
    status,
    detail,
    instance,
    timestamp: new Date().toISOString(),
    ...(invalidParams ? { invalidParams } : {}),
  };

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/problem+json; charset=utf-8",
    },
  });
}
