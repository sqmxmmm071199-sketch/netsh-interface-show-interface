import {
  createComplianceCheckFallback,
  createContentGenerationFallback,
  generateComplianceCheck,
  generateContentVariants,
  getAiProviderLabel,
  isAiConfigured,
} from "@/services/ai";
import {
  apiError,
  apiSuccess,
  getWorkspaceErrorMessage,
  userMessages,
} from "@/lib/api-response";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import {
  contentTypeLabels,
  memoryTypeLabels,
  platformLabels,
} from "@/lib/labels";
import { logError } from "@/lib/logger";
import type { ComplianceCheckPromptInput } from "@/lib/prompts/compliance-check";
import {
  getPrimaryCreativeRequest,
  type ContentGenerationAssetInput,
  type ContentGenerationMemoryInput,
  type ContentGenerationPromptInput,
  type GeneratedContentVariant,
} from "@/lib/prompts/content-generation";
import { prisma } from "@/lib/prisma";
import {
  contentGenerationFormSchema,
  generatedContentVariantSchema,
} from "@/lib/validators/content-studio";

export const runtime = "nodejs";

async function getTemporaryWorkspace() {
  const result = await requireCurrentWorkspace();
  return {
    workspace: result.data?.workspace ?? null,
    error: result.error,
  };
}

function toAssetInput(asset: {
  id: string;
  fileName: string | null;
  title: string;
  type: string;
  aiDescription: string | null;
  description: string | null;
  tags: string[];
  productName: string | null;
  scene: string | null;
  visualStyle: string | null;
  suggestedUse: string | null;
  recommendedPlatforms: string[];
}): ContentGenerationAssetInput {
  return {
    id: asset.id,
    fileName: asset.fileName ?? asset.title,
    type: asset.type,
    aiDescription: asset.aiDescription ?? asset.description,
    tags: asset.tags,
    productName: asset.productName,
    scene: asset.scene,
    visualStyle: asset.visualStyle,
    suggestedUse: asset.suggestedUse,
    recommendedPlatforms: asset.recommendedPlatforms,
  };
}

function toMemoryInput(memory: {
  type: keyof typeof memoryTypeLabels;
  title: string;
  content: string;
  source: string | null;
  importance: number;
  priority: number;
  tags: string[];
}): ContentGenerationMemoryInput {
  return {
    type: memoryTypeLabels[memory.type],
    title: memory.title,
    content: memory.content,
    source: memory.source,
    importance: memory.importance ?? memory.priority,
    tags: memory.tags,
  };
}

function getForbiddenClaims(brandProfile: {
  forbiddenClaims?: string[] | null;
} | null) {
  return brandProfile?.forbiddenClaims ?? [];
}

function normalizeGeneratedVariants(
  value: unknown,
): GeneratedContentVariant[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((variant) => generatedContentVariantSchema.safeParse(variant))
    .filter((result) => result.success)
    .map((result) => result.data);
}

function normalizeTopicText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function getRequiredTopic(marketingGoal: string) {
  const primaryRequest = getPrimaryCreativeRequest(marketingGoal);
  const compactRequest = normalizeTopicText(primaryRequest);

  if (!compactRequest) return null;

  if (
    /^[\u4e00-\u9fa5A-Za-z0-9_-]{2,12}$/.test(compactRequest) &&
    !/^(文案|内容|脚本|种草|新品|发布|短视频|生成|写文案|写内容)$/.test(
      compactRequest,
    )
  ) {
    return primaryRequest.trim();
  }

  const topicMatch = compactRequest.match(
    /(?:关于|围绕|以)([\u4e00-\u9fa5A-Za-z0-9_-]{2,12})(?:写|生成|创作|做|为|的|$)/,
  );

  return topicMatch?.[1] ?? null;
}

function variantMentionsTopic(variant: GeneratedContentVariant, topic: string) {
  const normalizedTopic = normalizeTopicText(topic);
  const content = normalizeTopicText(
    [
      variant.title,
      variant.hook,
      variant.body,
      variant.cta,
      variant.visualSuggestion,
      variant.platformNotes,
      ...variant.hashtags,
    ].join("\n"),
  );

  return content.includes(normalizedTopic);
}

function buildComplianceInput({
  variant,
  values,
  brandProfile,
}: {
  variant: GeneratedContentVariant;
  values: ReturnType<typeof contentGenerationFormSchema.parse>;
  brandProfile: unknown;
}): ComplianceCheckPromptInput {
  const profile = brandProfile as
    | {
        forbiddenWords?: string[] | null;
        forbiddenClaims?: string[] | null;
      }
    | null;

  return {
    content: {
      title: variant.title,
      hook: variant.hook,
      body: variant.body,
      hashtags: variant.hashtags,
      cta: variant.cta,
      visualSuggestion: variant.visualSuggestion,
      platformNotes: variant.platformNotes,
    },
    platform: values.platform,
    platformLabel: platformLabels[values.platform],
    contentType: values.contentType,
    contentTypeLabel: contentTypeLabels[values.contentType],
    brandProfile,
    forbiddenWords: profile?.forbiddenWords ?? [],
    forbiddenClaims: getForbiddenClaims(profile),
  };
}

async function checkGeneratedVariants({
  variants,
  values,
  brandProfile,
}: {
  variants: GeneratedContentVariant[];
  values: ReturnType<typeof contentGenerationFormSchema.parse>;
  brandProfile: unknown;
}) {
  const checks = await Promise.all(
    variants.map(async (variant) => {
      const input = buildComplianceInput({ variant, values, brandProfile });

      if (!isAiConfigured()) {
        return createComplianceCheckFallback(input);
      }

      try {
        const result = await generateComplianceCheck(input);
        return result.data;
      } catch (error) {
        logError("content-studio/generate:compliance", error);
        return createComplianceCheckFallback(input);
      }
    }),
  );

  return variants.map((variant, index) => ({
    ...variant,
    complianceCheck: checks[index],
  }));
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "content-studio/generate",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const json = await request.json().catch(() => null);
    const parsed = contentGenerationFormSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("生成配置有误，请检查后重试。", {
        status: 400,
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const values = parsed.data;
    const [brandProfile, memories, selectedAssets] = await Promise.all([
      prisma.brandProfile.findUnique({
        where: { workspaceId: workspace.id },
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
        take: 20,
      }),
      values.selectedAssets.length > 0
        ? prisma.asset.findMany({
            where: {
              workspaceId: workspace.id,
              id: { in: values.selectedAssets },
            },
          })
        : Promise.resolve([]),
    ]);

    const promptInput: ContentGenerationPromptInput = {
      workspaceName: workspace.name,
      brandProfile,
      brandMemories: memories.map(toMemoryInput),
      selectedAssets: selectedAssets.map(toAssetInput),
      platform: values.platform,
      platformLabel: platformLabels[values.platform],
      contentType: values.contentType,
      contentTypeLabel: contentTypeLabels[values.contentType],
      marketingGoal: values.marketingGoal,
      tone: values.tone,
      numberOfVariants: values.numberOfVariants,
      extraInstructions: values.extraInstructions,
    };

    const result = await (async () => {
      if (!isAiConfigured()) {
        return {
          data: createContentGenerationFallback(promptInput),
          raw: "",
          parsed: false,
          error: `${getAiProviderLabel()} API key is not configured.`,
        };
      }

      try {
        return await generateContentVariants(promptInput);
      } catch (error) {
        logError("content-studio/generate:ai", error, {
          workspaceId: workspace.id,
          provider: getAiProviderLabel(),
        });

        return {
          data: createContentGenerationFallback(promptInput),
          raw: "",
          parsed: false,
          error: `${getAiProviderLabel()} 暂时不可用，已返回本地基础生成结果。`,
        };
      }
    })();

    const normalizedVariants = normalizeGeneratedVariants(result.data);
    const requiredTopic = getRequiredTopic(values.marketingGoal);
    const topicMatched =
      !requiredTopic ||
      normalizedVariants.some((variant) =>
        variantMentionsTopic(variant, requiredTopic),
      );
    const useFallbackForTopicMismatch =
      normalizedVariants.length > 0 && !topicMatched;
    const generatedVariants =
      normalizedVariants.length > 0 && topicMatched
        ? normalizedVariants
        : createContentGenerationFallback(promptInput);

    const variantsWithCompliance = await checkGeneratedVariants({
      variants: generatedVariants.slice(0, values.numberOfVariants),
      values,
      brandProfile,
    });

    return apiSuccess(
      {
        message: isAiConfigured()
          ? result.parsed
            ? normalizedVariants.length > 0
              ? useFallbackForTopicMismatch && requiredTopic
                ? `${getAiProviderLabel()} 返回内容未覆盖「${requiredTopic}」，已自动生成与需求一致的基础草稿并完成合规检查。`
                : `${getAiProviderLabel()} 内容已生成，并已完成合规检查。`
              : `${getAiProviderLabel()} 返回内容结构不完整，已返回基础生成结果并完成合规检查。`
            : `${result.error ?? `${getAiProviderLabel()} 返回格式不完整，已返回基础生成结果。`}已完成合规检查。`
          : `未配置 ${getAiProviderLabel()} API Key，已返回本地基础生成结果并完成合规检查。`,
        parsed: result.parsed,
        parseError: result.error,
        variants: variantsWithCompliance,
      },
      "content-studio/generate",
      {
        workspaceId: workspace.id,
        variantCount: variantsWithCompliance.length,
        parsed: result.parsed,
      },
    );
  } catch (error) {
    return apiError(userMessages.aiUnavailable, {
      status: 500,
      scope: "content-studio/generate",
      error,
    });
  }
}

