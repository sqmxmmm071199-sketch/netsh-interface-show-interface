import {
  apiError,
  apiSuccess,
  getWorkspaceErrorMessage,
  userMessages,
} from "@/lib/api-response";
import { requireCurrentWorkspace } from "@/lib/auth/current-workspace";
import { prisma } from "@/lib/prisma";
import { redirectToPath } from "@/lib/redirect-response";
import { workspaceSettingsSchema } from "@/lib/validators/settings";

export const runtime = "nodejs";

async function parseSettingsRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const isFormRequest =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  if (isFormRequest) {
    const formData = await request.formData();
    return {
      data: {
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
      },
      isFormRequest,
    };
  }

  return {
    data: await request.json().catch(() => null),
    isFormRequest,
  };
}

async function isSlugTaken(slug: string, workspaceId: string) {
  const existing = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true },
  });

  return Boolean(existing && existing.id !== workspaceId);
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return apiError(userMessages.databaseNotConfigured, {
        status: 500,
        scope: "settings/workspace",
        error: new Error("DATABASE_URL is not configured"),
      });
    }

    const current = await requireCurrentWorkspace();

    if (!current.data?.workspace) {
      return apiError(getWorkspaceErrorMessage(current.error), {
        status: current.status,
      });
    }

    const { data, isFormRequest } = await parseSettingsRequest(request);
    const parsed = workspaceSettingsSchema.safeParse(data);

    if (!parsed.success) {
      return apiError("工作区设置信息有误，请检查后重试。", {
        status: 400,
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const values = parsed.data;

    if (await isSlugTaken(values.slug, current.data.workspace.id)) {
      return apiError("这个 URL 标识已被其他品牌空间使用。", {
        status: 409,
      });
    }

    const workspace = await prisma.workspace.update({
      where: { id: current.data.workspace.id },
      data: {
        name: values.name,
        slug: values.slug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        updatedAt: true,
      },
    });

    if (isFormRequest) {
      return redirectToPath("/settings");
    }

    return apiSuccess(
      {
        message: "工作区设置已保存。",
        workspace,
      },
      "settings/workspace",
      { workspaceId: workspace.id },
    );
  } catch (error) {
    return apiError("工作区设置保存失败，请稍后重试。", {
      status: 500,
      scope: "settings/workspace",
      error,
    });
  }
}
