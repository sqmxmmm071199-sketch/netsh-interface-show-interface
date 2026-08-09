import {
  apiError,
  apiSuccess,
  getWorkspaceErrorMessage,
  userMessages,
} from "@/lib/api-response";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import { prisma } from "@/lib/prisma";
import { updateAssetStatusSchema } from "@/lib/validators/assets";

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
        scope: "assets/status",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const { assetId } = await context.params;
    const json = await request.json().catch(() => null);
    const parsed = updateAssetStatusSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("素材状态无效，请重新选择。", {
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

    const asset = await prisma.asset.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        usageStatus: parsed.data.status,
      },
      select: {
        id: true,
        status: true,
        usageStatus: true,
        updatedAt: true,
      },
    });

    return apiSuccess(
      {
        message: "素材状态已更新。",
        asset: {
          ...asset,
          updatedAt: asset.updatedAt.toISOString(),
        },
      },
      "assets/status",
      { workspaceId: workspace.id, assetId: asset.id, status: asset.status },
    );
  } catch (error) {
    return apiError("素材状态更新失败，请稍后重试。", {
      status: 500,
      scope: "assets/status",
      error,
    });
  }
}
