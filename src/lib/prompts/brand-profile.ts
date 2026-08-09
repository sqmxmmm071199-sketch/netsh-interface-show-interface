import type { AiPrompt } from "@/types/ai";

export type BrandProfilePromptInput = {
  brandName: string;
  websiteUrl?: string | null;
  storeUrl?: string | null;
  industry?: string | null;
  productDescription?: string | null;
  targetAudience?: string | null;
  brandTone?: string | null;
  brandKeywords: string[];
  forbiddenWords: string[];
  competitorLinks: string[];
  platformPreferences: string[];
};

export type BrandProfileAnalysis = {
  brandSummary: string;
  targetAudienceSummary: string;
  toneOfVoice: string[];
  contentAngles: string[];
  forbiddenClaims: string[];
  recommendedPlatforms: string[];
  marketingSuggestions: string[];
};

const stringArraySchema = {
  type: "array",
  items: { type: "string" },
};

const brandProfileAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "brandSummary",
    "targetAudienceSummary",
    "toneOfVoice",
    "contentAngles",
    "forbiddenClaims",
    "recommendedPlatforms",
    "marketingSuggestions",
  ],
  properties: {
    brandSummary: { type: "string" },
    targetAudienceSummary: { type: "string" },
    toneOfVoice: stringArraySchema,
    contentAngles: stringArraySchema,
    forbiddenClaims: stringArraySchema,
    recommendedPlatforms: stringArraySchema,
    marketingSuggestions: stringArraySchema,
  },
};

export function buildBrandProfilePrompt(input: BrandProfilePromptInput): AiPrompt {
  return {
    system:
      "你是资深品牌策略顾问和社媒内容运营顾问。你会根据品牌问卷生成结构化品牌分析。必须输出 JSON，不要输出 Markdown、解释文字或代码块。",
    user: JSON.stringify(
      {
        task: "根据用户填写的品牌问卷，生成更完整的品牌分析，用于后续社媒内容生成、内容日历规划和合规检查。",
        constraints: [
          "必须基于用户给出的信息，不要编造具体事实。",
          "如果信息不足，请给出谨慎、可执行的概括。",
          "forbiddenClaims 只指出不建议使用的营销表达，不提供法律意见。",
          "toneOfVoice、contentAngles、forbiddenClaims、recommendedPlatforms、marketingSuggestions 每项建议 3-6 条。",
          "所有内容使用中文。",
        ],
        requiredOutputShape: {
          brandSummary: "品牌总结",
          targetAudienceSummary: "目标用户总结",
          toneOfVoice: ["品牌语调关键词"],
          contentAngles: ["内容方向"],
          forbiddenClaims: ["不建议使用的营销表达"],
          recommendedPlatforms: ["推荐平台"],
          marketingSuggestions: ["营销建议"],
        },
        questionnaire: input,
        outputLanguage: "zh-CN",
      },
      null,
      2,
    ),
    jsonSchema: {
      name: "brand_profile_analysis",
      description: "品牌档案问卷的结构化 AI 分析结果。",
      schema: brandProfileAnalysisSchema,
      strict: true,
    },
  };
}
