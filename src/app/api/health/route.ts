import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

type HealthPayload = {
  app: string;
  status: "ok" | "error";
  timestamp: string;
  uptime: number;
  checks: {
    app: "ok";
    database: "ok" | "skipped" | "error";
  };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shouldCheckDatabase = url.searchParams.get("db") === "1";

  const payload: HealthPayload = {
    app: "yunque-marketing-assistant",
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    checks: {
      app: "ok",
      database: "skipped",
    },
  };

  if (shouldCheckDatabase) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      payload.checks.database = "ok";
    } catch (error) {
      logError("health:database", error);
      payload.status = "error";
      payload.checks.database = "error";
    }
  }

  return NextResponse.json(payload, {
    status: payload.status === "ok" ? 200 : 503,
  });
}
