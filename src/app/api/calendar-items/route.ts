import { ContentStatus } from "@prisma/client";
import {
  apiError,
  apiSuccess,
  getWorkspaceErrorMessage,
  userMessages,
} from "@/lib/api-response";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import { prisma } from "@/lib/prisma";
import { createCalendarItemSchema } from "@/lib/validators/calendar";

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
        scope: "calendar/create",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const json = await request.json().catch(() => null);
    const parsed = createCalendarItemSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("日历信息有误，请检查发布日期、时间和主题。", {
        status: 400,
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const values = parsed.data;
    const scheduledAt = new Date(`${values.plannedDate}T${values.plannedTime}:00`);

    if (Number.isNaN(scheduledAt.getTime())) {
      return apiError("发布日期或发布时间无效。", { status: 400 });
    }

    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const content = await prisma.generatedContent.findFirst({
      where: {
        id: values.generatedContentId,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
      },
    });

    if (!content) {
      return apiError("未找到可加入日历的内容。", { status: 404 });
    }

    const item = await prisma.contentCalendarItem.create({
      data: {
        workspaceId: workspace.id,
        generatedContentId: content.id,
        title: values.topic,
        description: content.body.slice(0, 240),
        platform: values.platform,
        contentType: content.type,
        status: ContentStatus.SCHEDULED,
        scheduledAt,
        notes: values.notes || null,
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

    return apiSuccess(
      {
        message: "已加入内容日历。",
        item: {
          ...item,
          scheduledAt: item.scheduledAt.toISOString(),
          publishedAt: item.publishedAt?.toISOString() ?? null,
        },
      },
      "calendar/create",
      { workspaceId: workspace.id, itemId: item.id },
    );
  } catch (error) {
    return apiError("内容日历创建失败，请稍后重试。", {
      status: 500,
      scope: "calendar/create",
      error,
    });
  }
}
