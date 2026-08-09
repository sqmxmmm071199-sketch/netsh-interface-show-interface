import type { AiPrompt } from "@/types/ai";
import type { ComplianceCheckResult } from "@/lib/prompts/compliance-check";

export type ContentGenerationAssetInput = {
  id: string;
  fileName: string;
  type: string;
  aiDescription?: string | null;
  tags: string[];
  productName?: string | null;
  scene?: string | null;
  visualStyle?: string | null;
  suggestedUse?: string | null;
  recommendedPlatforms: string[];
};

export type ContentGenerationMemoryInput = {
  type: string;
  title: string;
  content: string;
  source?: string | null;
  importance: number;
  tags: string[];
};

export type ContentGenerationPromptInput = {
  workspaceName: string;
  brandProfile: unknown;
  brandMemories: ContentGenerationMemoryInput[];
  selectedAssets: ContentGenerationAssetInput[];
  platform: string;
  platformLabel: string;
  contentType: string;
  contentTypeLabel: string;
  marketingGoal: string;
  tone: string;
  numberOfVariants: number;
  extraInstructions?: string | null;
};

export type GeneratedContentVariant = {
  title: string;
  hook: string;
  body: string;
  hashtags: string[];
  cta: string;
  visualSuggestion: string;
  platformNotes: string;
  complianceCheck?: ComplianceCheckResult;
};

const stringArraySchema = {
  type: "array",
  items: { type: "string" },
};

const contentVariantSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "hook",
    "body",
    "hashtags",
    "cta",
    "visualSuggestion",
    "platformNotes",
  ],
  properties: {
    title: { type: "string" },
    hook: { type: "string" },
    body: { type: "string" },
    hashtags: stringArraySchema,
    cta: { type: "string" },
    visualSuggestion: { type: "string" },
    platformNotes: { type: "string" },
  },
};

const generatedContentVariantsSchema = {
  type: "array",
  minItems: 1,
  maxItems: 8,
  items: contentVariantSchema,
};

export function buildContentGenerationPrompt(
  input: ContentGenerationPromptInput,
): AiPrompt {
  return {
    system:
      "你是资深社媒营销内容策略师和品牌文案创作者。你会严格基于品牌档案、长期记忆和素材信息生成平台原生内容。必须输出 JSON 数组，不要输出 Markdown、解释文字或代码块。",
    user: JSON.stringify(
      {
        task: "根据品牌上下文、用户选择的素材和生成配置，生成可保存到 GeneratedContent 的社媒营销内容变体。",
        constraints: [
          "必须符合目标平台和内容类型，不要泛泛而谈。",
          "必须尽量利用 selectedAssets 中的素材描述、场景、视觉风格和建议用途。",
          "必须遵守 BrandProfile 中的禁用词、禁用营销表达和品牌语调。",
          "必须参考 brandMemories 中的长期品牌记忆，优先遵守重要度更高的偏好、平台经验、内容规则和合规规则。",
          "如果品牌信息不足，请用谨慎、可执行的表达，不要编造具体事实。",
          "hashtags 使用短标签，建议 3-8 个。",
          "生成数量必须等于 numberOfVariants。",
          "所有内容使用中文，平台名和必要英文标签可以保留英文。",
        ],
        requiredOutputShape: [
          {
            title: "内容标题",
            hook: "开头钩子",
            body: "正文",
            hashtags: ["标签"],
            cta: "行动号召",
            visualSuggestion: "图片或视频使用建议",
            platformNotes: "平台格式建议",
          },
        ],
        input,
        outputLanguage: "zh-CN",
      },
      null,
      2,
    ),
    jsonSchema: {
      name: "generated_content_variants",
      description: "社媒营销内容生成结果数组。",
      schema: generatedContentVariantsSchema,
      strict: true,
    },
  };
}
