import {
  apiError,
  apiSuccess,
  getWorkspaceErrorMessage,
  userMessages,
} from "@/lib/api-response";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import { prisma } from "@/lib/prisma";
import { updateAssetTagsSchema } from "@/lib/validators/assets";

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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "assets/tags",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const { assetId } = await context.params;
    const json = await request.json().catch(() => null);
    const parsed = updateAssetTagsSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("标签格式无效，请用逗号分隔并控制长度。", {
        status: 400,
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const existing = await prisma.asset.findFirst({
      where: {
        id: assetId,
        workspaceId: workspace.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return apiError("未找到可更新的素材。", { status: 404 });
    }

    const tags = [...new Set(parsed.data.tags)];
    const asset = await prisma.asset.update({
      where: { id: existing.id },
      data: { tags },
      select: {
        id: true,
        tags: true,
        updatedAt: true,
      },
    });

    return apiSuccess(
      {
        message: "素材标签已更新。",
        asset: {
          ...asset,
          updatedAt: asset.updatedAt.toISOString(),
        },
      },
      "assets/tags",
      { workspaceId: workspace.id, assetId: asset.id },
    );
  } catch (error) {
    return apiError("标签保存失败，请稍后重试。", {
      status: 500,
      scope: "assets/tags",
      error,
    });
  }
}
