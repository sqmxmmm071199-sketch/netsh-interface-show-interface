import { ContentStatus, Platform } from "@prisma/client";
import { z } from "zod";

export const createCalendarItemSchema = z.object({
  generatedContentId: z.string().trim().min(1, "请选择要加入日历的内容。"),
  plannedDate: z.string().trim().min(1, "请选择发布日期。"),
  plannedTime: z.string().trim().min(1, "请选择发布时间。"),
  platform: z.nativeEnum(Platform),
  topic: z.string().trim().min(1, "请填写内容主题。").max(160),
  notes: z.string().trim().max(1000).default(""),
});

export const updateCalendarItemStatusSchema = z.object({
  status: z.nativeEnum(ContentStatus),
});
