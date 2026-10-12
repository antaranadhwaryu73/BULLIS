/**
 * Database Telemetry & Stats Controller
 */

import { db } from "../db";

export async function handleGetDbStats(): Promise<Response> {
  const stats = db.getStats();
  return new Response(JSON.stringify({ data: stats }, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
