export const genericErrorMessage = "操作失败，请稍后重试。";

export async function parseApiPayload(response: Response) {
  return response.json().catch(() => ({}));
}

export function getApiErrorMessage(payload: unknown, fallback = genericErrorMessage) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as { error?: unknown };
  return typeof record.error === "string" && record.error.trim()
    ? record.error
    : fallback;
}

export async function readApiError(response: Response, fallback = genericErrorMessage) {
  const payload = await parseApiPayload(response);
  return getApiErrorMessage(payload, fallback);
}
