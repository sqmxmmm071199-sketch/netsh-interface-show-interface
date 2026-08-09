import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentWorkspaceContext } from "@/lib/auth/current-workspace";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const result = await getCurrentWorkspaceContext();

  if (!result.data && result.status === 401) {
    redirect("/login");
  }

  const data = result.data;

  return (
    <AppShell
      user={
        data
          ? {
              email: data.user.email,
              name: data.user.name,
            }
          : null
      }
      workspaces={
        data
          ? data.workspaces.map((workspace) => ({
              id: workspace.id,
              name: workspace.name,
            }))
          : []
      }
      currentWorkspaceId={data?.workspace?.id ?? null}
    >
      {children}
    </AppShell>
  );
}
