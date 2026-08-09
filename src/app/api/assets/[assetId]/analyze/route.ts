import { AssetType } from "@prisma/client";
import {
  createAssetAnalysisFallback,
  generateAssetAnalysis,
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
import type {
  AssetAnalysis,
  AssetAnalysisPromptInput,
} from "@/lib/prompts/asset-analysis";
import { prisma } from "@/lib/prisma";
import { readPublicFileAsDataUrl, readPublicTextFile } from "@/lib/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

async function getTemporaryWorkspace() {
  const result = await requireCurrentWorkspace();
  return {
    workspace: result.data?.workspace ?? null,
    error: result.error,
  };
}

function stringifyMetadata(metadata: unknown) {
  if (!metadata) return null;

  try {
    return JSON.stringify(metadata, null, 2).slice(0, 4000);
  } catch {
    return null;
  }
}

function cleanList(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeAnalysis(analysis: AssetAnalysis): AssetAnalysis {
  return {
    aiDescription: analysis.aiDescription?.trim() || "暂无素材描述。",
    tags:
      cleanList(analysis.tags ?? []).length > 0
        ? cleanList(analysis.tags ?? [])
        : ["素材", "待分类"],
    productName: analysis.productName?.trim() || "未明确",
    scene: analysis.scene?.trim() || "未明确",
    visualStyle: analysis.visualStyle?.trim() || "未明确",
    suggestedUse:
      analysis.suggestedUse?.trim() || "可用于后续内容生成参考。",
    recommendedPlatforms:
      cleanList(analysis.recommendedPlatforms ?? []).length > 0
        ? cleanList(analysis.recommendedPlatforms ?? [])
        : ["小红书", "Instagram"],
  };
}

async function buildAnalysisInput(assetId: string, workspaceId: string) {
  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      workspaceId,
    },
    include: {
      batch: {
        select: {
          name: true,
          description: true,
        },
      },
    },
  });

  if (!asset) return null;

  const fileName = asset.fileName ?? asset.title;
  const fileType = asset.fileType ?? asset.mimeType;
  const fileUrl = asset.fileUrl ?? asset.url;
  const textContent =
    asset.type === AssetType.TEXT && fileUrl
      ? await readPublicTextFile(fileUrl)
      : null;
  const metadataText = stringifyMetadata(asset.metadata);

  const input: AssetAnalysisPromptInput = {
    fileName,
    assetType: asset.type,
    fileType,
    description: asset.aiDescription ?? asset.description,
    batchName: asset.batch.name,
    batchDescription: asset.batch.description,
    tags: asset.tags,
    productName: asset.productName,
    scene: asset.scene,
    suggestedUse: asset.suggestedUse,
    recommendedPlatforms: asset.recommendedPlatforms,
    metadata: metadataText,
    textContent,
    hasImageInput: false,
  };

  const imageDataUrl =
    asset.type === AssetType.IMAGE && fileUrl
      ? fileUrl.startsWith("http://") || fileUrl.startsWith("https://")
        ? fileUrl
        : await readPublicFileAsDataUrl(fileUrl, fileType ?? "image/jpeg")
      : null;

  return {
    asset,
    input: {
      ...input,
      hasImageInput: Boolean(imageDataUrl),
    },
    imageDataUrl,
  };
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "assets/analyze",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const { assetId } = await context.params;
    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const built = await buildAnalysisInput(assetId, workspace.id);

    if (!built) {
      return apiError("未找到可分析的素材。", { status: 404 });
    }

    const result = isAiConfigured()
      ? await generateAssetAnalysis({
          input: built.input,
          imageDataUrl: built.imageDataUrl,
        })
      : {
          data: createAssetAnalysisFallback(built.input),
          raw: "",
          parsed: false,
          error: "AI provider API key is not configured.",
        };

    const analysis = normalizeAnalysis(result.data);
    const updatedAsset = await prisma.asset.update({
      where: { id: built.asset.id },
      data: {
        aiDescription: analysis.aiDescription,
        description: analysis.aiDescription,
        tags: analysis.tags,
        productName: analysis.productName,
        scene: analysis.scene,
        visualStyle: analysis.visualStyle,
        suggestedUse: analysis.suggestedUse,
        recommendedPlatforms: analysis.recommendedPlatforms,
      },
    });

    return apiSuccess(
      {
        message: isAiConfigured()
          ? result.parsed
            ? `${getAiProviderLabel()} 素材分析已完成。`
            : `${getAiProviderLabel()} 返回格式不完整，已保存基础分析结果。`
          : `未配置 ${getAiProviderLabel()} API Key，已保存基础分析结果。`,
        parsed: result.parsed,
        parseError: result.error,
        analysis: {
          aiDescription: updatedAsset.aiDescription,
          tags: updatedAsset.tags,
          productName: updatedAsset.productName,
          scene: updatedAsset.scene,
          visualStyle: updatedAsset.visualStyle,
          suggestedUse: updatedAsset.suggestedUse,
          recommendedPlatforms: updatedAsset.recommendedPlatforms,
        },
      },
      "assets/analyze",
      {
        workspaceId: workspace.id,
        assetId: updatedAsset.id,
        parsed: result.parsed,
      },
    );
  } catch (error) {
    return apiError(userMessages.aiUnavailable, {
      status: 500,
      scope: "assets/analyze",
      error,
    });
  }
}

