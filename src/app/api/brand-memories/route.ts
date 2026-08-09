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

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "brand-memories/create",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

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

    const values = parsed.data;
    const memory = await prisma.brandMemory.create({
      data: {
        workspaceId: workspace.id,
        type: values.memoryType,
        title: buildMemoryTitle(values),
        content: values.content,
        source: values.source || "手动添加",
        importance: values.importance,
        priority: values.importance,
        isActive: true,
      },
    });

    return apiSuccess(
      {
        message: "品牌记忆已创建。",
        memory: {
          ...memory,
          createdAt: memory.createdAt.toISOString(),
          updatedAt: memory.updatedAt.toISOString(),
        },
      },
      "brand-memories/create",
      { workspaceId: workspace.id, memoryId: memory.id },
    );
  } catch (error) {
    return apiError("品牌记忆创建失败，请稍后重试。", {
      status: 500,
      scope: "brand-memories/create",
      error,
    });
  }
}
