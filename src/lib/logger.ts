type LogContext = Record<string, unknown>;

function formatContext(context?: LogContext) {
  return context && Object.keys(context).length > 0 ? context : undefined;
}

export function logInfo(scope: string, message: string, context?: LogContext) {
  console.info(`[${scope}] ${message}`, formatContext(context) ?? "");
}

export function logWarn(scope: string, message: string, context?: LogContext) {
  console.warn(`[${scope}] ${message}`, formatContext(context) ?? "");
}

export function logError(scope: string, error: unknown, context?: LogContext) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${scope}] ${message}`, {
    ...formatContext(context),
    error,
  });
}
