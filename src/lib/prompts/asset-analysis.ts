import type { AiPrompt } from "@/types/ai";

export type AssetAnalysisPromptInput = {
  fileName: string;
  assetType: string;
  fileType?: string | null;
  description?: string | null;
  batchName?: string | null;
  batchDescription?: string | null;
  tags: string[];
  productName?: string | null;
  scene?: string | null;
  suggestedUse?: string | null;
  recommendedPlatforms: string[];
  metadata?: unknown;
  textContent?: string | null;
  hasImageInput: boolean;
};

export type AssetAnalysis = {
  aiDescription: string;
  tags: string[];
  productName: string;
  scene: string;
  visualStyle: string;
  suggestedUse: string;
  recommendedPlatforms: string[];
};

const stringArraySchema = {
  type: "array",
  items: { type: "string" },
};

const assetAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "aiDescription",
    "tags",
    "productName",
    "scene",
    "visualStyle",
    "suggestedUse",
    "recommendedPlatforms",
  ],
  properties: {
    aiDescription: { type: "string" },
    tags: stringArraySchema,
    productName: { type: "string" },
    scene: { type: "string" },
    visualStyle: { type: "string" },
    suggestedUse: { type: "string" },
    recommendedPlatforms: stringArraySchema,
  },
};

export function buildAssetAnalysisPrompt(input: AssetAnalysisPromptInput): AiPrompt {
  return {
    system:
      "你是资深品牌素材分析师和社媒内容运营顾问。你会根据素材文件、图片内容或可用文本信息，输出结构化素材分析。必须输出 JSON，不要输出 Markdown、解释文字或代码块。",
    user: JSON.stringify(
      {
        task: "分析单个素材，判断它适合沉淀成什么内容资产，并给出标签、场景、风格、用途和推荐平台。",
        constraints: [
          "如果提供了图片输入，优先基于图片内容分析，不要只复述文件名。",
          "如果没有图片或无法读取文件内容，请基于文件名、用户说明、标签、批次信息、文本内容和 metadata 做谨慎推断。",
          "不要编造具体品牌事实；无法确定时用“未明确”或概括性表达。",
          "tags 建议 3-8 个，使用短中文标签。",
          "recommendedPlatforms 建议 2-5 个，可包含小红书、Instagram、TikTok、Facebook、Pinterest、LinkedIn。",
          "所有内容使用中文。",
        ],
        requiredOutputShape: {
          aiDescription: "素材内容描述",
          tags: ["标签"],
          productName: "可能对应的产品名",
          scene: "使用场景",
          visualStyle: "视觉风格",
          suggestedUse: "建议用于什么内容",
          recommendedPlatforms: ["推荐平台"],
        },
        asset: input,
        outputLanguage: "zh-CN",
      },
      null,
      2,
    ),
    jsonSchema: {
      name: "asset_analysis",
      description: "品牌素材的结构化 AI 分析结果。",
      schema: assetAnalysisSchema,
      strict: true,
    },
  };
}
