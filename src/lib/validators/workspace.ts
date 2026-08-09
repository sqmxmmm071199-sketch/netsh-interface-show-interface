import { z } from "zod";

export const workspaceFormSchema = z.object({
  name: z.string().trim().min(2, "请填写至少 2 个字符的品牌空间名称。").max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "只能使用小写字母、数字和单个连字符。")
    .min(3)
    .max(60)
    .optional()
    .or(z.literal("")),
});

export const switchWorkspaceSchema = z.object({
  workspaceId: z.string().trim().min(1),
});

export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;
