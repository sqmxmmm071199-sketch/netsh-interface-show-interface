import { AssetStatus, ContentStatus } from "@prisma/client";
import {
  apiError,
  apiSuccess,
  getWorkspaceErrorMessage,
  userMessages,
} from "@/lib/api-response";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import { prisma } from "@/lib/prisma";
import { updateCalendarItemStatusSchema } from "@/lib/validators/calendar";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    itemId: string;
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
        scope: "calendar/status",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const { itemId } = await context.params;
    const json = await request.json().catch(() => null);
    const parsed = updateCalendarItemStatusSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("日历状态无效，请重新选择。", {
        status: 400,
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const existing = await prisma.contentCalendarItem.findFirst({
      where: {
        id: itemId,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
        generatedContentId: true,
      },
    });

    if (!existing) {
      return apiError("未找到可更新的内容日历项。", { status: 404 });
    }

    const status = parsed.data.status;
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.contentCalendarItem.update({
        where: { id: existing.id },
        data: {
          status,
          publishedAt: status === ContentStatus.PUBLISHED ? new Date() : null,
        },
        include: {
          generatedContent: {
            select: {
              id: true,
              title: true,
              body: true,
              type: true,
              status: true,
              platforms: true,
              assets: {
                select: {
                  id: true,
                  title: true,
                  fileName: true,
                },
              },
            },
          },
        },
      });

      if (status === ContentStatus.PUBLISHED && existing.generatedContentId) {
        await tx.generatedContent.update({
          where: { id: existing.generatedContentId },
          data: { status: ContentStatus.PUBLISHED },
        });

        await tx.asset.updateMany({
          where: {
            workspaceId: workspace.id,
            generatedContents: {
              some: { id: existing.generatedContentId },
            },
          },
          data: {
            status: AssetStatus.USED,
            usageStatus: AssetStatus.USED,
          },
        });
      }

      return updated;
    });

    return apiSuccess(
      {
        message:
          status === ContentStatus.PUBLISHED
            ? "内容已标记为已发布，关联内容和素材状态已同步。"
            : "内容日历状态已更新。",
        item: {
          ...item,
          scheduledAt: item.scheduledAt.toISOString(),
          publishedAt: item.publishedAt?.toISOString() ?? null,
        },
      },
      "calendar/status",
      { workspaceId: workspace.id, itemId: item.id, status },
    );
  } catch (error) {
    return apiError("日历状态更新失败，请稍后重试。", {
      status: 500,
      scope: "calendar/status",
      error,
    });
  }
}
