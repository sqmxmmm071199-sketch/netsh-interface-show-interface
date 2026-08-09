import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
