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
  outputLanguage?: "ZH_CN" | "EN_WITH_ZH";
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

export function getPrimaryCreativeRequest(marketingGoal: string) {
  return (
    marketingGoal
      .split(/\n+\s*补充营销目标：/)
      .at(0)
      ?.trim() || marketingGoal.trim()
  );
}

export function buildContentGenerationPrompt(
  input: ContentGenerationPromptInput,
): AiPrompt {
  const primaryUserRequest = getPrimaryCreativeRequest(input.marketingGoal);
  const outputLanguage = input.outputLanguage ?? "ZH_CN";
  const languageRules =
    outputLanguage === "EN_WITH_ZH"
      ? [
          "所有用户可见文案字段必须先输出英文，包括 title、hook、body、cta、visualSuggestion、platformNotes。",
          "每个长文案字段都要追加中文对照，并使用清晰标签「中文对照：」。",
          "title 可以使用「English title / 中文标题」格式；body 可以先给完整英文正文，再给「中文对照：」后的完整中文译文。",
          "hashtags 优先输出英文标签，可补充 1-3 个中文标签用于对照。",
        ]
      : [
          "所有用户可见文案字段必须使用中文，平台名和必要英文标签可以保留英文。",
        ];

  return {
    system:
      "你是资深社媒营销内容策略师和品牌文案创作者。用户原始创作需求是最高优先级；品牌档案、长期记忆和素材信息只用于补充语调、约束和可用素材，不能覆盖或替换用户指定的主题、产品或任务。必须输出 JSON 数组，不要输出 Markdown、解释文字或代码块。",
    user: JSON.stringify(
      {
        task: "优先根据 primaryUserRequest 生成可保存到 GeneratedContent 的社媒营销内容变体，再结合品牌上下文、用户选择的素材和生成配置做风格与合规适配。",
        primaryUserRequest,
        priorityRules: [
          "primaryUserRequest 是本次创作的主任务，标题、hook、正文、CTA 和素材建议必须围绕它展开。",
          "如果 primaryUserRequest 只是一个名词或短词，例如「苹果」，必须把它当作本次内容主题或产品，不要擅自替换成品牌档案里的其他产品。",
          "BrandProfile 和 brandMemories 只用于保持品牌语调、禁用表达、平台经验和合规边界；当它们与 primaryUserRequest 冲突时，以 primaryUserRequest 为主题，以品牌信息为表达风格参考。",
        ],
        constraints: [
          "必须显式回应用户输入的主题、产品或任务，不得生成与用户输入无关的内容。",
          "必须符合目标平台和内容类型，不要泛泛而谈。",
          "必须尽量利用 selectedAssets 中的素材描述、场景、视觉风格和建议用途。",
          "必须遵守 BrandProfile 中的禁用词、禁用营销表达和品牌语调。",
          "必须参考 brandMemories 中的长期品牌记忆，优先遵守重要度更高的偏好、平台经验、内容规则和合规规则。",
          "如果品牌信息不足，请用谨慎、可执行的表达，不要编造具体事实。",
          "hashtags 使用短标签，建议 3-8 个。",
          "生成数量必须等于 numberOfVariants。",
          ...languageRules,
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
        outputLanguage:
          outputLanguage === "EN_WITH_ZH"
            ? "English first, with Chinese reference"
            : "zh-CN",
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
