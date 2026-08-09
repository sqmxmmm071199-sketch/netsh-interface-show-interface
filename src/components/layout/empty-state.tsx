import { Database } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Database className="size-6" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
