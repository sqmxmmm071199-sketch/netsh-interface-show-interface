import { ContentStatus } from "@prisma/client";
import {
  apiError,
  apiSuccess,
  getWorkspaceErrorMessage,
  userMessages,
} from "@/lib/api-response";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import { prisma } from "@/lib/prisma";
import { addGeneratedContentToCalendarSchema } from "@/lib/validators/content-studio";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    contentId: string;
  }>;
};

async function getTemporaryWorkspace() {
  const result = await requireCurrentWorkspace();
  return {
    workspace: result.data?.workspace ?? null,
    error: result.error,
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "content-studio/calendar",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const { contentId } = await context.params;
    const json = await request.json().catch(() => null);
    const parsed = addGeneratedContentToCalendarSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("排期信息有误，请检查时间和备注。", {
        status: 400,
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const scheduledAt = new Date(parsed.data.scheduledAt);

    if (Number.isNaN(scheduledAt.getTime())) {
      return apiError("排期时间无效。", { status: 400 });
    }

    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const content = await prisma.generatedContent.findFirst({
      where: {
        id: contentId,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        platforms: true,
      },
    });

    if (!content) {
      return apiError("未找到可加入日历的内容。", { status: 404 });
    }

    const platform = content.platforms[0];

    if (!platform) {
      return apiError("该内容缺少平台信息，暂时无法加入日历。", {
        status: 400,
      });
    }

    const item = await prisma.contentCalendarItem.create({
      data: {
        workspaceId: workspace.id,
        generatedContentId: content.id,
        title: content.title,
        description: content.body.slice(0, 240),
        platform,
        contentType: content.type,
        status: ContentStatus.SCHEDULED,
        scheduledAt,
        ownerName: parsed.data.ownerName || null,
        notes: parsed.data.notes || null,
      },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
      },
    });

    return apiSuccess(
      {
        message: "已加入内容日历。",
        item: {
          ...item,
          scheduledAt: item.scheduledAt.toISOString(),
        },
      },
      "content-studio/calendar",
      { workspaceId: workspace.id, contentId, itemId: item.id },
    );
  } catch (error) {
    return apiError("加入内容日历失败，请稍后重试。", {
      status: 500,
      scope: "content-studio/calendar",
      error,
    });
  }
}
