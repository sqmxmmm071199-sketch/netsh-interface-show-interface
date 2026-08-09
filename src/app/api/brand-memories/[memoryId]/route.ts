import {
  apiError,
  apiSuccess,
  getWorkspaceErrorMessage,
  userMessages,
} from "@/lib/api-response";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import { memoryTypeLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { brandMemoryFormSchema } from "@/lib/validators/brand-memory";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    memoryId: string;
  }>;
};

async function getTemporaryWorkspace() {
  const result = await requireCurrentWorkspace();
  return {
    workspace: result.data?.workspace ?? null,
    error: result.error,
  };
}

function buildMemoryTitle({
  title,
  memoryType,
  content,
}: {
  title: string;
  memoryType: keyof typeof memoryTypeLabels;
  content: string;
}) {
  if (title) return title;
  return `${memoryTypeLabels[memoryType]}：${content.slice(0, 28)}`;
}

async function findWorkspaceMemory(memoryId: string, workspaceId: string) {
  return prisma.brandMemory.findFirst({
    where: {
      id: memoryId,
      workspaceId,
    },
    select: { id: true },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "brand-memories/update",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const { memoryId } = await context.params;
    const json = await request.json().catch(() => null);
    const parsed = brandMemoryFormSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("品牌记忆信息有误，请检查后重试。", {
        status: 400,
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const existing = await findWorkspaceMemory(memoryId, workspace.id);

    if (!existing) {
      return apiError("未找到可更新的品牌记忆。", { status: 404 });
    }

    const values = parsed.data;
    const memory = await prisma.brandMemory.update({
      where: { id: existing.id },
      data: {
        type: values.memoryType,
        title: buildMemoryTitle(values),
        content: values.content,
        source: values.source || "手动添加",
        importance: values.importance,
        priority: values.importance,
      },
    });

    return apiSuccess(
      {
        message: "品牌记忆已更新。",
        memory: {
          ...memory,
          createdAt: memory.createdAt.toISOString(),
          updatedAt: memory.updatedAt.toISOString(),
        },
      },
      "brand-memories/update",
      { workspaceId: workspace.id, memoryId: memory.id },
    );
  } catch (error) {
    return apiError("品牌记忆更新失败，请稍后重试。", {
      status: 500,
      scope: "brand-memories/update",
      error,
    });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "brand-memories/delete",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const { memoryId } = await context.params;
    const { workspace, error } = await getTemporaryWorkspace();

    if (!workspace) {
      return apiError(getWorkspaceErrorMessage(error), { status: 404 });
    }

    const existing = await findWorkspaceMemory(memoryId, workspace.id);

    if (!existing) {
      return apiError("未找到可删除的品牌记忆。", { status: 404 });
    }

    await prisma.brandMemory.delete({
      where: { id: existing.id },
    });

    return apiSuccess(
      {
        message: "品牌记忆已删除。",
        memoryId: existing.id,
      },
      "brand-memories/delete",
      { workspaceId: workspace.id, memoryId: existing.id },
    );
  } catch (error) {
    return apiError("品牌记忆删除失败，请稍后重试。", {
      status: 500,
      scope: "brand-memories/delete",
      error,
    });
  }
}
