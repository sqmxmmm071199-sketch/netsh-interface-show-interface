import type { AiPrompt } from "@/types/ai";

export type ReplyScenario =
  | "GENERAL_INQUIRY"
  | "PRODUCT_QUESTION"
  | "NEGATIVE_COMMENT"
  | "AFTER_SALES"
  | "PARTNERSHIP"
  | "SENSITIVE";

export const replyScenarioLabels: Record<ReplyScenario, string> = {
  GENERAL_INQUIRY: "普通咨询",
  PRODUCT_QUESTION: "产品问题",
  NEGATIVE_COMMENT: "负面评论",
  AFTER_SALES: "售后问题",
  PARTNERSHIP: "合作咨询",
  SENSITIVE: "敏感问题",
};

export type ReplySuggestion = {
  suggestedReply: string;
  tone: string;
  riskNotes: string;
  alternativeReplies: string[];
};

export type ReplyAssistantPromptInput = {
  customerMessage: string;
  scenario: ReplyScenario;
  scenarioLabel: string;
  brandProfile: unknown;
  brandMemories: Array<{
    type: string;
    title: string;
    content: string;
    source: string | null;
    importance: number;
  }>;
};

export function buildReplyAssistantPrompt(
  input: ReplyAssistantPromptInput,
): AiPrompt {
  return {
    system:
      "你是品牌社媒客服回复助手。请根据品牌档案、品牌记忆、客户消息和回复场景生成谨慎、清晰、符合品牌语气的回复。必须输出 JSON。",
    user: JSON.stringify(
      {
        task: "生成评论或私信回复建议",
        scenario: input.scenarioLabel,
        customerMessage: input.customerMessage,
        brandProfile: input.brandProfile,
        brandMemories: input.brandMemories,
        outputShape: {
          suggestedReply: "建议回复",
          tone: "回复语气",
          riskNotes: "风险提醒",
          alternativeReplies: ["其他版本"],
        },
      },
      null,
      2,
    ),
  };
}
