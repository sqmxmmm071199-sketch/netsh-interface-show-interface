import { cookies } from "next/headers";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { shouldUseDevAuthFallback } from "@/lib/supabase/config";

export const currentWorkspaceCookieName = "yunque_current_workspace_id";

export type CurrentWorkspaceContext = {
  authUser: SupabaseUser;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
  workspace: Awaited<ReturnType<typeof getOwnedWorkspaces>>[number] | null;
  workspaces: Awaited<ReturnType<typeof getOwnedWorkspaces>>;
};

export type WorkspaceAuthResult =
  | {
      data: CurrentWorkspaceContext;
      error: null;
      status: 200;
    }
  | {
      data: null;
      error: string;
      status: 401 | 404 | 500;
    };

function getUserName(authUser: SupabaseUser) {
  const metadata = authUser.user_metadata ?? {};
  const fullName = metadata.full_name ?? metadata.name;
  return typeof fullName === "string" && fullName.trim()
    ? fullName.trim()
    : authUser.email?.split("@")[0] ?? null;
}

async function ensurePrismaUser(authUser: SupabaseUser) {
  const email = authUser.email;

  if (!email) {
    throw new Error("当前登录用户缺少 email，无法创建业务用户。");
  }

  const byAuthId = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
    },
  });

  if (byAuthId) return byAuthId;

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        authUserId: authUser.id,
        name: getUserName(authUser),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });
  }

  return prisma.user.create({
    data: {
      authUserId: authUser.id,
      email,
      name: getUserName(authUser),
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
    },
  });
}

async function getOwnedWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      brandProfile: true,
    },
  });
}

async function getDevWorkspaceContext(): Promise<WorkspaceAuthResult> {
  const fallbackEmail =
    process.env.DEV_AUTH_FALLBACK_EMAIL || "mia@yunque.example";
  const user = await prisma.user.findUnique({
    where: { email: fallbackEmail },
    select: {
      id: true,
      authUserId: true,
      email: true,
      name: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    return {
      data: null,
      error: `本地开发用户 ${fallbackEmail} 不存在，请先执行 npm run prisma:seed。`,
      status: 404,
    };
  }

  const workspaces = await getOwnedWorkspaces(user.id);
  const cookieStore = await cookies();
  const preferredWorkspaceId = cookieStore.get(currentWorkspaceCookieName)?.value;
  const workspace =
    workspaces.find((item) => item.id === preferredWorkspaceId) ??
    workspaces[0] ??
    null;
  const authUser = {
    id: user.authUserId ?? `dev-${user.id}`,
    email: user.email,
    user_metadata: {
      name: user.name,
    },
  } as unknown as SupabaseUser;

  return {
    data: {
      authUser,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      workspace,
      workspaces,
    },
    error: null,
    status: 200,
  };
}

export async function getCurrentWorkspaceContext(): Promise<WorkspaceAuthResult> {
  if (!process.env.DATABASE_URL) {
    return {
      data: null,
      error: "尚未配置 DATABASE_URL，无法读取工作区数据。",
      status: 500,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    if (shouldUseDevAuthFallback()) {
      return getDevWorkspaceContext();
    }

    return {
      data: null,
      error:
        "尚未配置 Supabase Auth。请设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
      status: 401,
    };
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      data: null,
      error: "请先登录。",
      status: 401,
    };
  }

  try {
    const user = await ensurePrismaUser(authUser);
    const workspaces = await getOwnedWorkspaces(user.id);
    const cookieStore = await cookies();
    const preferredWorkspaceId = cookieStore.get(currentWorkspaceCookieName)?.value;
    const workspace =
      workspaces.find((item) => item.id === preferredWorkspaceId) ??
      workspaces[0] ??
      null;

    return {
      data: {
        authUser,
        user,
        workspace,
        workspaces,
      },
      error: null,
      status: 200,
    };
  } catch (error) {
    logError("current-workspace", error);
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "读取当前用户和工作区失败。",
      status: 500,
    };
  }
}

export async function requireCurrentWorkspace() {
  const result = await getCurrentWorkspaceContext();

  if (!result.data) return result;

  if (!result.data.workspace) {
    return {
      data: null,
      error: "当前用户还没有品牌空间，请先创建 Workspace。",
      status: 404 as const,
    };
  }

  return {
    data: {
      ...result.data,
      workspace: result.data.workspace,
    },
    error: null,
    status: 200 as const,
  };
}
