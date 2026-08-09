import {
  generateBrandProfileAnalysis,
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
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getTemporaryWorkspace() {
  const result = await requireCurrentWorkspace();
  return {
    workspace: result.data?.workspace ?? null,
    error: result.error,
  };
}

export async function POST() {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "brand-profile/analyze",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    if (!isAiConfigured()) {
      return apiError(`AI 功能尚未配置，请先设置 ${getAiProviderLabel()} API Key。`, {
        status: 500,
        scope: "brand-profile/analyze",
        error: new Error(`${getAiProviderLabel()} API key is not configured`),
      });
    }

    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const profile = await prisma.brandProfile.findUnique({
      where: { workspaceId: workspace.id },
    });

    if (!profile) {
      return apiError("请先保存品牌问卷，再进行 AI 分析。", {
        status: 404,
      });
    }

    const result = await generateBrandProfileAnalysis({
      brandName: profile.brandName,
      websiteUrl: profile.websiteUrl,
      storeUrl: profile.storeUrl,
      industry: profile.industry,
      productDescription: profile.productDescription,
      targetAudience: profile.targetAudience,
      brandTone: profile.brandTone,
      brandKeywords: profile.brandKeywords,
      forbiddenWords: profile.forbiddenWords,
      competitorLinks: profile.competitorLinks,
      platformPreferences: Array.isArray(profile.platformPreferences)
        ? profile.platformPreferences.map(String)
        : profile.platformPreferences
          ? [JSON.stringify(profile.platformPreferences)]
          : [],
    });

    const updatedProfile = await prisma.brandProfile.update({
      where: { id: profile.id },
      data: {
        brandSummary: result.data.brandSummary,
        targetAudienceSummary: result.data.targetAudienceSummary,
        toneOfVoice: result.data.toneOfVoice,
        contentAngles: result.data.contentAngles,
        forbiddenClaims: result.data.forbiddenClaims,
        recommendedPlatforms: result.data.recommendedPlatforms,
        marketingSuggestions: result.data.marketingSuggestions,
        aiAnalysisUpdatedAt: new Date(),
      },
    });

    return apiSuccess(
      {
        message: result.parsed
          ? `${getAiProviderLabel()} 品牌分析已完成。`
          : `${getAiProviderLabel()} 返回格式不完整，已保存基础分析结果。`,
        parsed: result.parsed,
        parseError: result.error,
        analysis: {
          brandSummary: updatedProfile.brandSummary,
          targetAudienceSummary: updatedProfile.targetAudienceSummary,
          toneOfVoice: updatedProfile.toneOfVoice,
          contentAngles: updatedProfile.contentAngles,
          forbiddenClaims: updatedProfile.forbiddenClaims,
          recommendedPlatforms: updatedProfile.recommendedPlatforms,
          marketingSuggestions: updatedProfile.marketingSuggestions,
          aiAnalysisUpdatedAt:
            updatedProfile.aiAnalysisUpdatedAt?.toISOString() ?? null,
        },
      },
      "brand-profile/analyze",
      { workspaceId: workspace.id, profileId: profile.id, parsed: result.parsed },
    );
  } catch (error) {
    return apiError(userMessages.aiUnavailable, {
      status: 500,
      scope: "brand-profile/analyze",
      error,
    });
  }
}
