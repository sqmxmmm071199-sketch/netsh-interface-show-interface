import {
  createReplySuggestionFallback,
  generateReplySuggestion,
  getAiProviderLabel,
  isAiConfigured,
} from "@/services/ai";
import { apiError, apiSuccess, userMessages } from "@/lib/api-response";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import { memoryTypeLabels } from "@/lib/labels";
import { logError } from "@/lib/logger";
import {
  replyScenarioLabels,
  type ReplyAssistantPromptInput,
} from "@/lib/prompts/reply-assistant";
import { prisma } from "@/lib/prisma";
import { replyAssistantFormSchema } from "@/lib/validators/reply-assistant";

export const runtime = "nodejs";

async function getTemporaryWorkspace() {
  const result = await requireCurrentWorkspace();
  return result.data?.workspace ?? null;
}

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = replyAssistantFormSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("回复信息有误，请检查客户消息和回复场景。", {
        status: 400,
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const values = parsed.data;
    let brandProfile: unknown = null;
    let memories: Array<{
      type: keyof typeof memoryTypeLabels;
      title: string;
      content: string;
      source: string | null;
      importance: number;
      priority: number;
    }> = [];
    let contextWarning: string | null = null;

    if (process.env.DATABASE_URL) {
      const workspace = await getTemporaryWorkspace().catch((error) => {
        logError("reply-assistant:workspace", error);
        return null;
      });

      if (workspace) {
        try {
          [brandProfile, memories] = await Promise.all([
            prisma.brandProfile.findUnique({
              where: { workspaceId: workspace.id },
              select: {
                brandName: true,
                industry: true,
                productDescription: true,
                description: true,
                targetAudience: true,
                brandTone: true,
                brandKeywords: true,
                forbiddenWords: true,
                forbiddenClaims: true,
                toneOfVoice: true,
                recommendedPlatforms: true,
              },
            }),
            prisma.brandMemory.findMany({
              where: {
                workspaceId: workspace.id,
                isActive: true,
              },
              orderBy: [
                { importance: "desc" },
                { priority: "desc" },
                { createdAt: "asc" },
              ],
              take: 16,
            }),
          ]);
        } catch (error) {
          logError("reply-assistant:context", error, {
            workspaceId: workspace.id,
          });
          contextWarning = "品牌上下文读取失败，已使用基础回复建议。";
        }
      } else {
        contextWarning = "未找到可用品牌空间，已使用基础回复建议。";
      }
    } else {
      contextWarning = "数据库尚未配置，已使用基础回复建议。";
    }

    const input: ReplyAssistantPromptInput = {
      customerMessage: values.customerMessage,
      scenario: values.scenario,
      scenarioLabel: replyScenarioLabels[values.scenario],
      brandProfile,
      brandMemories: memories.map((memory) => ({
        type: memoryTypeLabels[memory.type],
        title: memory.title,
        content: memory.content,
        source: memory.source,
        importance: memory.importance ?? memory.priority,
      })),
    };

    const result = isAiConfigured()
      ? await generateReplySuggestion(input)
      : {
          data: createReplySuggestionFallback(input),
          raw: "",
          parsed: false,
          error: "AI provider API key is not configured.",
        };

    return apiSuccess(
      {
        message:
          contextWarning ??
          (isAiConfigured()
            ? result.parsed
              ? `${getAiProviderLabel()} 回复建议已生成。`
              : `${getAiProviderLabel()} 返回格式不完整，已返回基础回复建议。`
            : `未配置 ${getAiProviderLabel()} API Key，已返回本地基础回复建议。`),
        parsed: result.parsed,
        parseError: result.error,
        contextWarning,
        suggestion: result.data,
      },
      "reply-assistant",
      { parsed: result.parsed, scenario: values.scenario },
    );
  } catch (error) {
    return apiError(userMessages.aiUnavailable, {
      status: 500,
      scope: "reply-assistant",
      error,
    });
  }
}

