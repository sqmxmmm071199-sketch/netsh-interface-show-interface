import OpenAI from "openai";
import type { ResponseInputMessageContentList } from "openai/resources/responses/responses";
import {
  buildBrandProfilePrompt,
  type BrandProfileAnalysis,
  type BrandProfilePromptInput,
} from "@/lib/prompts/brand-profile";
import {
  buildAssetAnalysisPrompt,
  type AssetAnalysis,
  type AssetAnalysisPromptInput,
} from "@/lib/prompts/asset-analysis";
import {
  buildContentGenerationPrompt,
  type ContentGenerationPromptInput,
  type GeneratedContentVariant,
} from "@/lib/prompts/content-generation";
import {
  buildComplianceCheckPrompt,
  type ComplianceCheckPromptInput,
  type ComplianceCheckResult,
  type RiskLevel,
} from "@/lib/prompts/compliance-check";
import {
  buildInsightsPrompt,
  type InsightsPromptInput,
  type InsightsResult,
} from "@/lib/prompts/insights";
import {
  buildReplyAssistantPrompt,
  replyScenarioLabels,
  type ReplyAssistantPromptInput,
  type ReplySuggestion,
} from "@/lib/prompts/reply-assistant";
import type { AiPrompt, GenerateJsonResult } from "@/types/ai";

type GenerateJsonOptions<T> = {
  prompt: AiPrompt;
  fallback: T;
  model?: string;
};

export type AiProvider = "openai" | "deepseek";

const defaultOpenAIModel = "gpt-5.5";
const defaultDeepSeekModel = "deepseek-chat";
const defaultDeepSeekBaseURL = "https://api.deepseek.com";

const globalForAI = globalThis as unknown as {
  openai?: OpenAI;
  deepseek?: OpenAI;
};

export function getAiProvider(): AiProvider {
  const configuredProvider = process.env.AI_PROVIDER?.toLowerCase();

  if (configuredProvider === "deepseek") return "deepseek";
  if (configuredProvider === "openai") return "openai";
  if (process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) {
    return "deepseek";
  }

  return "openai";
}

export function getAiProviderLabel() {
  return getAiProvider() === "deepseek" ? "DeepSeek" : "OpenAI";
}

export function isAiConfigured() {
  return getAiProvider() === "deepseek"
    ? Boolean(process.env.DEEPSEEK_API_KEY)
    : Boolean(process.env.OPENAI_API_KEY);
}

export function getConfiguredAiModel(model?: string) {
  if (model) return model;
  return getAiProvider() === "deepseek"
    ? process.env.DEEPSEEK_MODEL || defaultDeepSeekModel
    : process.env.OPENAI_MODEL || defaultOpenAIModel;
}

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!globalForAI.openai) {
    globalForAI.openai = new OpenAI({ apiKey });
  }

  return globalForAI.openai;
}

export function getDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured.");
  }

  if (!globalForAI.deepseek) {
    globalForAI.deepseek = new OpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL || defaultDeepSeekBaseURL,
    });
  }

  return globalForAI.deepseek;
}

function stripCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonCandidate(value: string) {
  const clean = stripCodeFence(value);
  if (clean.startsWith("{") && clean.endsWith("}")) return clean;
  if (clean.startsWith("[") && clean.endsWith("]")) return clean;

  const objectStart = clean.indexOf("{");
  const objectEnd = clean.lastIndexOf("}");

  if (objectStart >= 0 && objectEnd > objectStart) {
    return clean.slice(objectStart, objectEnd + 1);
  }

  return clean;
}

export function parseJsonWithFallback<T>(
  raw: string,
  fallback: T,
): GenerateJsonResult<T> {
  try {
    return {
      data: JSON.parse(extractJsonCandidate(raw)) as T,
      raw,
      parsed: true,
    };
  } catch (error) {
    return {
      data: fallback,
      raw,
      parsed: false,
      error: error instanceof Error ? error.message : "JSON parse failed.",
    };
  }
}

async function generateOpenAIJson<T>({
  prompt,
  fallback,
  model,
}: GenerateJsonOptions<T>): Promise<GenerateJsonResult<T>> {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: getConfiguredAiModel(model),
    instructions: prompt.system,
    input: prompt.user,
    text: prompt.jsonSchema
      ? {
          format: {
            type: "json_schema",
            name: prompt.jsonSchema.name,
            description: prompt.jsonSchema.description,
            schema: prompt.jsonSchema.schema,
            strict: prompt.jsonSchema.strict ?? true,
          },
        }
      : {
          format: {
            type: "json_object",
          },
        },
  });

  return parseJsonWithFallback(response.output_text ?? "", fallback);
}

async function generateDeepSeekJson<T>({
  prompt,
  fallback,
  model,
}: GenerateJsonOptions<T>): Promise<GenerateJsonResult<T>> {
  const client = getDeepSeekClient();
  const schemaType = prompt.jsonSchema?.schema.type;
  const response = await client.chat.completions.create({
    model: getConfiguredAiModel(model),
    messages: [
      {
        role: "system",
        content: prompt.system,
      },
      {
        role: "user",
        content: prompt.user,
      },
    ],
    response_format: schemaType === "array" ? undefined : { type: "json_object" },
  });
  const raw = response.choices[0]?.message?.content ?? "";

  return parseJsonWithFallback(raw, fallback);
}

export async function generateJson<T>(
  options: GenerateJsonOptions<T>,
): Promise<GenerateJsonResult<T>> {
  return getAiProvider() === "deepseek"
    ? generateDeepSeekJson(options)
    : generateOpenAIJson(options);
}

export function createBrandProfileAnalysisFallback(
  input: BrandProfilePromptInput,
): BrandProfileAnalysis {
  const brandName = input.brandName || "未命名品牌";

  return {
    brandSummary:
      input.productDescription || `${brandName} 的品牌问卷已保存，但 AI 分析暂不可用。`,
    targetAudienceSummary: input.targetAudience || "暂无足够目标用户信息。",
    toneOfVoice: input.brandTone
      ? input.brandTone
          .split(/[,，\n]/)
          .map((item) => item.trim())
          .filter(Boolean)
      : input.brandKeywords.slice(0, 4),
    contentAngles: input.brandKeywords.map((keyword) => `围绕「${keyword}」展开内容主题`),
    forbiddenClaims: input.forbiddenWords.map((word) => `避免使用「${word}」相关表达`),
    recommendedPlatforms:
      input.platformPreferences.length > 0
        ? input.platformPreferences
        : ["小红书", "Instagram", "TikTok"],
    marketingSuggestions: [
      "补充更具体的产品卖点、目标用户痛点和平台运营目标。",
      "将高频品牌关键词沉淀为内容选题模板。",
      "生成内容前先检查禁用词和夸大表达。",
    ],
  };
}

export async function generateBrandProfileAnalysis(
  input: BrandProfilePromptInput,
) {
  return generateJson<BrandProfileAnalysis>({
    prompt: buildBrandProfilePrompt(input),
    fallback: createBrandProfileAnalysisFallback(input),
  });
}

function compactStringList(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function createAssetAnalysisFallback(
  input: AssetAnalysisPromptInput,
): AssetAnalysis {
  const baseTags = compactStringList([
    ...input.tags,
    input.assetType,
    input.fileType,
    input.scene,
    input.productName,
  ]);
  const tags = [...new Set(baseTags)].slice(0, 8);
  const productName = input.productName || "未明确";
  const scene = input.scene || input.batchName || "未明确";
  const suggestedUse =
    input.suggestedUse ||
    (input.assetType === "IMAGE"
      ? "可用于素材库归档、社媒配图或内容生成参考。"
      : "可作为内容生成、卖点提炼或运营资料整理的参考素材。");

  return {
    aiDescription:
      input.description ||
      `素材「${input.fileName}」已完成基础分析。当前无法直接读取完整文件内容，已基于文件名、说明和 metadata 生成初步描述。`,
    tags: tags.length > 0 ? tags : ["素材", "待分析", "品牌资产"],
    productName,
    scene,
    visualStyle: input.hasImageInput ? "图片视觉风格待进一步确认" : "非视觉素材",
    suggestedUse,
    recommendedPlatforms:
      input.recommendedPlatforms.length > 0
        ? input.recommendedPlatforms
        : ["小红书", "Instagram", "TikTok"],
  };
}

export async function generateAssetAnalysis({
  input,
  imageDataUrl,
}: {
  input: AssetAnalysisPromptInput;
  imageDataUrl?: string | null;
}) {
  if (getAiProvider() === "deepseek") {
    const promptInput = imageDataUrl
      ? {
          ...input,
          hasImageInput: false,
          textContent: [
            input.textContent,
            "当前 DeepSeek 接入使用文本模型，图片文件本身未发送；请基于文件名、说明、标签、批次信息和 metadata 做基础分析。",
          ]
            .filter(Boolean)
            .join("\n"),
        }
      : input;

    return generateJson<AssetAnalysis>({
      prompt: buildAssetAnalysisPrompt(promptInput),
      fallback: createAssetAnalysisFallback(promptInput),
    });
  }

  const prompt = buildAssetAnalysisPrompt(input);
  const content: ResponseInputMessageContentList = [
    {
      type: "input_text",
      text: prompt.user,
    },
  ];

  if (imageDataUrl) {
    content.push({
      type: "input_image",
      image_url: imageDataUrl,
      detail: "auto",
    });
  }

  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: getConfiguredAiModel(),
    instructions: prompt.system,
    input: [
      {
        role: "user",
        content,
      },
    ],
    text: prompt.jsonSchema
      ? {
          format: {
            type: "json_schema",
            name: prompt.jsonSchema.name,
            description: prompt.jsonSchema.description,
            schema: prompt.jsonSchema.schema,
            strict: prompt.jsonSchema.strict ?? true,
          },
        }
      : {
          format: {
            type: "json_object",
          },
        },
  });

  return parseJsonWithFallback<AssetAnalysis>(
    response.output_text ?? "",
    createAssetAnalysisFallback(input),
  );
}

export function createContentGenerationFallback(
  input: ContentGenerationPromptInput,
): GeneratedContentVariant[] {
  const assetNames = input.selectedAssets
    .map((asset) => asset.fileName || asset.productName)
    .filter(Boolean);
  const productName =
    input.selectedAssets.find((asset) => asset.productName)?.productName ||
    "主推产品";
  const goal = input.marketingGoal || "提升品牌内容表现";
  const memoryHints = input.brandMemories
    .slice()
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3)
    .map((memory) => `${memory.type}：${memory.content}`)
    .filter(Boolean);

  return Array.from({ length: Math.max(1, input.numberOfVariants) }, (_, index) => {
    const variantNumber = index + 1;

    return {
      title: `${input.platformLabel} ${input.contentTypeLabel}草稿 ${variantNumber}`,
      hook: `如果你正在寻找更轻松的${productName}使用灵感，这条内容可以先收藏。`,
      body: [
        `围绕「${goal}」，这条内容建议从真实使用场景切入。`,
        input.tone ? `整体语气保持${input.tone}。` : "整体表达保持清晰、可信和克制。",
        assetNames.length > 0
          ? `可参考素材：${assetNames.slice(0, 3).join("、")}。`
          : "当前未选择素材，可先用品牌档案信息生成基础文案。",
        memoryHints.length > 0
          ? `长期品牌记忆：${memoryHints.join("；")}。`
          : "",
        input.extraInstructions ? `额外要求：${input.extraInstructions}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      hashtags: ["品牌内容", "新品灵感", input.platformLabel].filter(Boolean),
      cta: "保存这条灵感，后续发布前再结合素材微调。",
      visualSuggestion:
        input.selectedAssets[0]?.suggestedUse ||
        "优先选择清晰展示产品或使用场景的素材作为首图/开场镜头。",
      platformNotes: `${input.platformLabel} 内容需要适配 ${input.contentTypeLabel} 的浏览节奏，发布前检查标题、首屏信息和行动号召。`,
    };
  });
}

export async function generateContentVariants(input: ContentGenerationPromptInput) {
  return generateJson<GeneratedContentVariant[]>({
    prompt: buildContentGenerationPrompt(input),
    fallback: createContentGenerationFallback(input),
  });
}

export function createInsightsFallback(input: InsightsPromptInput): InsightsResult {
  const topPlatform = input.metrics.topPlatform ?? "暂无明确平台";
  const commonType = input.metrics.mostCommonContentType ?? "暂无明确类型";

  return {
    monthlySummary: `${input.monthLabel}，${input.workspaceName} 共生成 ${input.metrics.generatedContentCount} 条内容，计划发布 ${input.metrics.plannedPublishCount} 条，已发布 ${input.metrics.publishedCount} 条。当前素材侧还有 ${input.metrics.unusedAssetCount} 个未使用素材、${input.metrics.usedAssetCount} 个已使用素材；最常出现的平台是 ${topPlatform}，最常见内容类型是 ${commonType}。这些结论只基于系统内数据，不包含真实社媒平台表现。`,
    assetSuggestions:
      input.metrics.unusedAssetCount > 0
        ? [
            `优先从 ${input.metrics.unusedAssetCount} 个未使用素材中挑选可复用素材，补齐下月内容日历。`,
            "为高价值素材补充 AI 描述、标签、产品名和推荐平台，提升内容生成时的可用性。",
            "把已发布内容中使用过的素材沉淀为可复用模板，减少每次重新选素材的成本。",
          ]
        : [
            "当前未使用素材较少，建议继续上传新品图、场景图、用户反馈和卖点文档。",
            "按平台建立素材批次，例如小红书封面、短视频开头镜头、轮播图素材。",
          ],
    contentSuggestions: [
      input.metrics.generatedContentCount > 0
        ? `复盘本月 ${input.metrics.generatedContentCount} 条生成内容，把表现稳定的标题结构和 CTA 写入品牌记忆。`
        : "本月生成内容偏少，建议先围绕 3 个核心营销目标建立内容主题池。",
      `当前最常见内容类型是 ${commonType}，下月可以增加其他内容类型来降低表达单一性。`,
      "把已保存但未排期的内容加入内容日历，形成更连续的发布节奏。",
    ],
    platformSuggestions: [
      input.metrics.topPlatform
        ? `继续围绕 ${topPlatform} 复用有效素材，同时检查是否需要补充其他平台版本。`
        : "当前平台分布不明显，建议先选择 1-2 个主平台建立稳定内容节奏。",
      "同一主题可以拆成不同平台格式：小红书重视标题和封面，TikTok/Instagram 重视开头钩子和视觉节奏。",
    ],
    riskSuggestions:
      input.metrics.highRiskContentCount > 0
        ? [
            `本月有 ${input.metrics.highRiskContentCount} 条高风险内容，发布前需要人工复核绝对化承诺、敏感功效和禁用词。`,
            "把反复出现的风险表达写入合规规则类品牌记忆，让后续生成自动避开。",
          ]
        : [
            "本月未发现高风险内容，但发布前仍建议检查禁用词、夸大承诺和平台格式风险。",
            "继续维护 BrandProfile 的 forbiddenWords 和 BrandMemory 的合规规则。",
          ],
    nextMonthPlan: [
      "先确定下月 3-5 个主题，再为每个主题选择素材、生成内容、加入日历。",
      "每周至少沉淀 1 条品牌记忆，把运营复盘变成后续 AI 生成的长期上下文。",
      "优先补齐未使用素材的内容消化计划，并把高风险内容安排在发布前复核。",
    ],
  };
}

export async function generateInsights(input: InsightsPromptInput) {
  return generateJson<InsightsResult>({
    prompt: buildInsightsPrompt(input),
    fallback: createInsightsFallback(input),
  });
}

export function createReplySuggestionFallback(
  input: ReplyAssistantPromptInput,
): ReplySuggestion {
  const cautious =
    input.scenario === "NEGATIVE_COMMENT" ||
    input.scenario === "SENSITIVE" ||
    input.scenario === "AFTER_SALES";
  const scenarioLabel = replyScenarioLabels[input.scenario];
  const memoryHint = input.brandMemories
    .slice()
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 2)
    .map((memory) => memory.content)
    .join("；");

  const suggestedReply = cautious
    ? `你好，感谢你愿意把这个情况告诉我们。我们会认真核实，也理解你的顾虑。为了更准确地帮你处理，方便的话请补充相关订单信息、购买渠道或具体使用场景。我们会基于实际情况给你进一步回复。`
    : `你好，感谢你的留言。关于你的问题，我们建议先结合具体使用场景来判断；如果你方便补充更多信息，我们可以给你更准确的建议。`;

  return {
    suggestedReply,
    tone: cautious ? "克制、理解、谨慎、愿意协助" : "友好、清晰、专业、自然",
    riskNotes: cautious
      ? "当前场景需要避免争辩、绝对化承诺、退款赔付承诺、功效保证或无法核实的事实判断。"
      : "回复前仍建议检查是否包含禁用词、夸大承诺或超出品牌实际能力的表述。",
    alternativeReplies: [
      `${suggestedReply} ${memoryHint ? `同时我们会参考品牌规则：${memoryHint}` : ""}`.trim(),
      `收到你的信息了，我们先帮你记录这个问题。为了避免误判，想再确认一下具体情况：${input.customerMessage.slice(0, 80)}`,
      scenarioLabel === "合作咨询"
        ? "你好，感谢关注我们的品牌。可以请你补充合作形式、账号/渠道信息和预期内容方向吗？我们会评估是否适合进一步沟通。"
        : "谢谢你的反馈，我们会认真看待。你可以把更多细节发给我们，我们会尽量给到清晰、稳妥的回复。",
    ],
  };
}

export async function generateReplySuggestion(input: ReplyAssistantPromptInput) {
  return generateJson<ReplySuggestion>({
    prompt: buildReplyAssistantPrompt(input),
    fallback: createReplySuggestionFallback(input),
  });
}

const absolutePromisePatterns = [
  "100% effective",
  "guaranteed",
  "best",
  "cure",
  "risk-free",
  "100%",
  "保证",
  "最佳",
  "第一",
  "治愈",
  "根治",
  "零风险",
  "无风险",
  "永久有效",
  "全网第一",
];

const sensitiveExpressionPatterns = [
  "医疗",
  "金融",
  "健康",
  "减肥",
  "保健品",
  "瘦身",
  "降糖",
  "治疗",
  "疗效",
  "投资",
  "收益",
  "medical",
  "finance",
  "health",
  "weight loss",
  "supplement",
];

function joinComplianceContent(input: ComplianceCheckPromptInput) {
  return [
    input.content.title,
    input.content.hook,
    input.content.body,
    input.content.cta,
    input.content.hashtags.join(" "),
    input.content.visualSuggestion,
    input.content.platformNotes,
  ]
    .filter(Boolean)
    .join("\n");
}

function findCaseInsensitive(source: string, keyword: string) {
  return source.toLowerCase().includes(keyword.toLowerCase());
}

function inferRiskLevel(issueReasons: string[]): RiskLevel {
  if (
    issueReasons.some(
      (reason) =>
        reason.includes("禁用词") ||
        reason.includes("敏感") ||
        reason.includes("绝对化"),
    )
  ) {
    return "high";
  }

  if (issueReasons.length > 0) return "medium";
  return "low";
}

export function createComplianceCheckFallback(
  input: ComplianceCheckPromptInput,
): ComplianceCheckResult {
  const content = joinComplianceContent(input);
  const issues: ComplianceCheckResult["issues"] = [];

  for (const keyword of absolutePromisePatterns) {
    if (findCaseInsensitive(content, keyword)) {
      issues.push({
        text: keyword,
        reason: "包含绝对化承诺或难以证实的强承诺表达。",
        suggestion: "改为更谨慎的体验式表达，例如「有助于」「适合」「可以尝试」。",
      });
    }
  }

  for (const keyword of sensitiveExpressionPatterns) {
    if (findCaseInsensitive(content, keyword)) {
      issues.push({
        text: keyword,
        reason: "涉及医疗、金融、健康、减肥或保健品等敏感表达。",
        suggestion: "避免功效承诺，改为描述产品特征、使用场景或用户体验。",
      });
    }
  }

  for (const keyword of [...input.forbiddenWords, ...input.forbiddenClaims]) {
    if (keyword && findCaseInsensitive(content, keyword)) {
      issues.push({
        text: keyword,
        reason: "命中 BrandProfile 中的禁用词或不建议使用的营销表达。",
        suggestion: "删除该表达，改为更克制、可验证的品牌语言。",
      });
    }
  }

  const riskLevel = inferRiskLevel(issues.map((issue) => issue.reason));

  return {
    riskLevel,
    issues: issues.slice(0, 12),
    overallSuggestion:
      riskLevel === "low"
        ? "未发现明显合规风险。发布前仍建议结合平台规则和品牌禁用词复核。"
        : riskLevel === "medium"
          ? "存在可调整的表达风险，建议按替代表达修改后再发布。"
          : "存在高风险表达，建议谨慎使用并优先改写相关内容。",
  };
}

export async function generateComplianceCheck(input: ComplianceCheckPromptInput) {
  return generateJson<ComplianceCheckResult>({
    prompt: buildComplianceCheckPrompt(input),
    fallback: createComplianceCheckFallback(input),
  });
}
