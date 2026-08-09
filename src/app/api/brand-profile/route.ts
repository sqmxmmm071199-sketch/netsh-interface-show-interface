import { prisma } from "@/lib/prisma";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import {
  apiError,
  apiSuccess,
  getWorkspaceErrorMessage,
  userMessages,
} from "@/lib/api-response";
import {
  brandProfileFormSchema,
  splitCommaText,
} from "@/lib/validators/brand-profile";

export const runtime = "nodejs";

async function getTemporaryWorkspace() {
  const result = await requireCurrentWorkspace();
  return {
    workspace: result.data?.workspace ?? null,
    error: result.error,
  };
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "brand-profile/save",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const json = await request.json().catch(() => null);
    const parsed = brandProfileFormSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("品牌档案信息有误，请检查表单后重试。", {
        status: 400,
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const values = parsed.data;
    const brandKeywords = splitCommaText(values.brandKeywords);
    const forbiddenWords = splitCommaText(values.forbiddenWords);
    const competitorLinks = splitCommaText(values.competitorLinks);
    const platformPreferences = splitCommaText(values.platformPreferences);
    const toneKeywords = splitCommaText(values.brandTone);
    const targetAudiences = values.targetAudience?.trim()
      ? [values.targetAudience.trim()]
      : [];

    const profile = await prisma.brandProfile.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        brandName: values.brandName,
        websiteUrl: values.websiteUrl || null,
        storeUrl: values.storeUrl || null,
        industry: values.industry || null,
        productDescription: values.productDescription || null,
        targetAudience: values.targetAudience || null,
        brandTone: values.brandTone || null,
        brandKeywords,
        forbiddenWords,
        competitorLinks,
        platformPreferences,
        description: values.productDescription || null,
        toneKeywords,
        targetAudiences,
      },
      update: {
        brandName: values.brandName,
        websiteUrl: values.websiteUrl || null,
        storeUrl: values.storeUrl || null,
        industry: values.industry || null,
        productDescription: values.productDescription || null,
        targetAudience: values.targetAudience || null,
        brandTone: values.brandTone || null,
        brandKeywords,
        forbiddenWords,
        competitorLinks,
        platformPreferences,
        description: values.productDescription || null,
        toneKeywords,
        targetAudiences,
      },
    });

    return apiSuccess(
      {
        message: "品牌档案已保存。",
        profile: {
          id: profile.id,
          brandName: profile.brandName,
          updatedAt: profile.updatedAt.toISOString(),
        },
      },
      "brand-profile/save",
      { workspaceId: workspace.id, profileId: profile.id },
    );
  } catch (error) {
    return apiError("品牌档案保存失败，请稍后重试。", {
      status: 500,
      scope: "brand-profile/save",
      error,
    });
  }
}
