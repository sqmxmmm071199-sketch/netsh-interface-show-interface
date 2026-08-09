import { MemoryType } from "@prisma/client";
import { z } from "zod";

export const brandMemoryFormSchema = z.object({
  memoryType: z.nativeEnum(MemoryType),
  title: z.string().trim().max(120).default(""),
  content: z.string().trim().min(2, "请填写记忆内容。").max(1500),
  source: z.string().trim().max(120).default("手动添加"),
  importance: z.coerce.number().int().min(1).max(10).default(5),
});

export type BrandMemoryFormValues = z.infer<typeof brandMemoryFormSchema>;
