import type { AiPrompt } from "@/types/ai";

export type InsightsResult = {
  monthlySummary: string;
  assetSuggestions: string[];
  contentSuggestions: string[];
  platformSuggestions: string[];
  riskSuggestions: string[];
  nextMonthPlan: string[];
};

export type InsightsPromptInput = {
  workspaceName: string;
  monthLabel: string;
  brandProfile: {
    brandName: string | null;
    industry: string | null;
    productDescription: string | null;
    targetAudience: string | null;
    brandTone: string | null;
    forbiddenWords: string[];
    recommendedPlatforms: string[];
  } | null;
  metrics: {
    generatedContentCount: number;
    plannedPublishCount: number;
    publishedCount: number;
    topPlatform: string | null;
    topPlatformCount: number;
    unusedAssetCount: number;
    usedAssetCount: number;
    highRiskContentCount: number;
    mostCommonContentType: string | null;
    mostCommonContentTypeCount: number;
    activeMemoryCount: number;
  };
  brandMemories: Array<{
    type: string;
    title: string;
    content: string;
    source: string | null;
    importance: number;
  }>;
  contentSamples: Array<{
    title: string;
    type: string;
    status: string;
    platforms: string[];
    riskLevel: string | null;
  }>;
  calendarSamples: Array<{
    title: string;
    platform: string;
    contentType: string;
    status: string;
    scheduledAt: string;
  }>;
};

const stringArraySchema = {
  type: "array",
  items: { type: "string" },
};

const insightsSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "monthlySummary",
    "assetSuggestions",
    "contentSuggestions",
    "platformSuggestions",
    "riskSuggestions",
    "nextMonthPlan",
  ],
  properties: {
    monthlySummary: { type: "string" },
    assetSuggestions: stringArraySchema,
    contentSuggestions: stringArraySchema,
    platformSuggestions: stringArraySchema,
    riskSuggestions: stringArraySchema,
    nextMonthPlan: stringArraySchema,
  },
};

export function buildInsightsPrompt(input: InsightsPromptInput): AiPrompt {
  return {
    system:
      "你是品牌社媒运营分析助手。你会基于系统内数据做月度运营总结和下月行动建议。MVP 阶段没有真实平台表现数据，所以不要编造曝光、点击、转化、粉丝增长等外部指标。必须输出 JSON，不要输出 Markdown、解释文字或代码块。",
    user: JSON.stringify(
      {
        task: "基于当前 workspace 的品牌档案、素材、生成内容、内容日历和品牌长期记忆，生成月度运营总结与建议。",
        constraints: [
          "只基于 input 中的系统内数据分析，不要声称已经连接真实社媒平台数据。",
          "建议必须可执行，适合小型品牌团队下月排期、素材复用和风险控制。",
          "如果数据不足，要指出缺口，并给出补齐数据资产的建议。",
          "高风险内容、未使用素材、平台集中度和内容类型单一性需要重点提醒。",
          "输出语言使用中文。",
        ],
        requiredOutputShape: {
          monthlySummary: "本月总结",
          assetSuggestions: ["素材建议"],
          contentSuggestions: ["内容建议"],
          platformSuggestions: ["平台建议"],
          riskSuggestions: ["风险建议"],
          nextMonthPlan: ["下月建议"],
        },
        input,
      },
      null,
      2,
    ),
    jsonSchema: {
      name: "monthly_operation_insights",
      description: "月度运营总结与建议。",
      schema: insightsSchema,
      strict: true,
    },
  };
}
