import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, trend, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="size-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-semibold">{value}</p>
          <Badge variant="secondary">{trend}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
