import { NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/logger";

type ApiErrorOptions = {
  status?: number;
  scope?: string;
  error?: unknown;
  context?: Record<string, unknown>;
  issues?: unknown;
};

export const userMessages = {
  databaseNotConfigured: "数据库尚未配置，请先完成环境变量和数据库初始化。",
  databaseUnavailable: "数据库暂时不可用，请稍后重试或联系管理员。",
  workspaceMissing: "当前没有可用的品牌空间，请先创建品牌空间。",
  invalidRequest: "提交的信息有误，请检查后重试。",
  unauthorized: "请先登录后再继续操作。",
  aiUnavailable: "AI 服务暂时不可用，请稍后重试。",
  uploadFailed: "素材上传失败，请稍后重试。",
  unknown: "操作失败，请稍后重试。",
} as const;

export function apiError(message: string, options: ApiErrorOptions = {}) {
  const status = options.status ?? 500;

  if (options.scope && options.error) {
    logError(options.scope, options.error, options.context);
  }

  return NextResponse.json(
    {
      error: message,
      issues: options.issues,
    },
    { status },
  );
}

export function apiSuccess<T extends Record<string, unknown>>(
  payload: T,
  scope?: string,
  context?: Record<string, unknown>,
) {
  if (scope) {
    logInfo(scope, "success", context);
  }

  return NextResponse.json(payload);
}

export function getWorkspaceErrorMessage(error?: string | null) {
  if (!error) return userMessages.workspaceMissing;
  if (error.includes("登录")) return userMessages.unauthorized;
  if (error.includes("DATABASE_URL") || error.includes("数据库")) {
    return userMessages.databaseUnavailable;
  }

  return userMessages.workspaceMissing;
}

export function getUnexpectedErrorMessage(error: unknown, fallback = userMessages.unknown) {
  if (error instanceof Error && error.message.includes("Database query timed out")) {
    return userMessages.databaseUnavailable;
  }

  return fallback;
}
