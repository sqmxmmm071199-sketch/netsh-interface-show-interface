import { cookies } from "next/headers";
import {
  apiError,
  apiSuccess,
  getWorkspaceErrorMessage,
} from "@/lib/api-response";
import {
  currentWorkspaceCookieName,
  getCurrentWorkspaceContext,
} from "@/lib/auth/current-workspace";
import { switchWorkspaceSchema } from "@/lib/validators/workspace";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const current = await getCurrentWorkspaceContext();

    if (!current.data) {
      return apiError(getWorkspaceErrorMessage(current.error), {
        status: current.status,
      });
    }

    const json = await request.json().catch(() => null);
    const parsed = switchWorkspaceSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("工作区切换信息有误，请重新选择。", {
        status: 400,
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const workspace = current.data.workspaces.find(
      (item) => item.id === parsed.data.workspaceId,
    );

    if (!workspace) {
      return apiError("无法切换到不属于当前用户的品牌空间。", {
        status: 403,
      });
    }

    const cookieStore = await cookies();
    cookieStore.set(currentWorkspaceCookieName, workspace.id, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });

    return apiSuccess(
      {
        message: "当前品牌空间已切换。",
        workspaceId: workspace.id,
      },
      "workspaces/current",
      { workspaceId: workspace.id, userId: current.data.user.id },
    );
  } catch (error) {
    return apiError("品牌空间切换失败，请稍后重试。", {
      status: 500,
      scope: "workspaces/current",
      error,
    });
  }
}
