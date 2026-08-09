import {
  apiError,
  apiSuccess,
  getWorkspaceErrorMessage,
  userMessages,
} from "@/lib/api-response";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import { prisma } from "@/lib/prisma";
import { updateGeneratedContentSchema } from "@/lib/validators/content-studio";

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

async function findWorkspaceContent(contentId: string, workspaceId: string) {
  return prisma.generatedContent.findFirst({
    where: {
      id: contentId,
      workspaceId,
    },
    select: {
      id: true,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "content-studio/update",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const { contentId } = await context.params;
    const json = await request.json().catch(() => null);
    const parsed = updateGeneratedContentSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("内容信息有误，请检查标题和正文。", {
        status: 400,
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const existing = await findWorkspaceContent(contentId, workspace.id);

    if (!existing) {
      return apiError("未找到可编辑的内容。", { status: 404 });
    }

    const updated = await prisma.generatedContent.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
      },
      select: {
        id: true,
        title: true,
        body: true,
        updatedAt: true,
      },
    });

    return apiSuccess(
      {
        message: "内容已更新。",
        content: {
          ...updated,
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      "content-studio/update",
      { workspaceId: workspace.id, contentId: updated.id },
    );
  } catch (error) {
    return apiError("内容更新失败，请稍后重试。", {
      status: 500,
      scope: "content-studio/update",
      error,
    });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "content-studio/delete",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const { contentId } = await context.params;
    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const existing = await findWorkspaceContent(contentId, workspace.id);

    if (!existing) {
      return apiError("未找到可删除的内容。", { status: 404 });
    }

    await prisma.generatedContent.delete({
      where: { id: existing.id },
    });

    return apiSuccess(
      {
        message: "内容已删除。",
        contentId: existing.id,
      },
      "content-studio/delete",
      { workspaceId: workspace.id, contentId: existing.id },
    );
  } catch (error) {
    return apiError("内容删除失败，请稍后重试。", {
      status: 500,
      scope: "content-studio/delete",
      error,
    });
  }
}
