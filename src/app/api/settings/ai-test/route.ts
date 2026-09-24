import { apiError, apiSuccess, userMessages } from "@/lib/api-response";
import { getAiProviderPublicStatus } from "@/lib/ai/provider";
import { generateJson, isAiConfigured } from "@/services/ai";

export const runtime = "nodejs";

type AiHealthCheck = {
  status: "ok";
  message: string;
};

const fallback: AiHealthCheck = {
  status: "ok",
  message: "Mock AI connection is ready.",
};

export async function GET() {
  return apiSuccess({
    status: getAiProviderPublicStatus(),
  });
}

export async function POST() {
  try {
    const status = getAiProviderPublicStatus();

    if (!isAiConfigured()) {
      return apiError(
        `${status.label} 尚未配置。请在服务端环境变量 ${status.apiKeyEnvName ?? "AI_PROVIDER"} 中完成配置。`,
        { status: 400 },
      );
    }

    if (status.provider === "mock") {
      return apiSuccess(
        {
          message: "Mock AI 已启用，生成能力会返回本地兜底内容。",
          status,
          checkedAt: new Date().toISOString(),
        },
        "settings/ai-test",
        { provider: status.provider },
      );
    }

    const result = await generateJson<AiHealthCheck>({
      prompt: {
        system:
          "你是一个连接健康检查助手。只返回 JSON，不要输出额外解释。",
        user: '请返回 {"status":"ok","message":"AI connection is ready."}',
        jsonSchema: {
          name: "ai_connection_test",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              status: { type: "string", enum: ["ok"] },
              message: { type: "string" },
            },
            required: ["status", "message"],
          },
        },
      },
      fallback,
    });

    return apiSuccess(
      {
        message: result.parsed
          ? "AI 连接测试成功。"
          : "AI 已响应，但返回格式不完整；请检查模型 JSON 输出能力。",
        status: getAiProviderPublicStatus(),
        checkedAt: new Date().toISOString(),
      },
      "settings/ai-test",
      { provider: status.provider, parsed: result.parsed },
    );
  } catch (error) {
    return apiError(userMessages.aiUnavailable, {
      status: 503,
      scope: "settings/ai-test",
      error,
    });
  }
}
