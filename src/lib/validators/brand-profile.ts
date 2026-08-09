import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || z.string().url().safeParse(value).success, {
    message: "请输入有效的链接地址",
  })
  .optional();

export const brandProfileFormSchema = z.object({
  brandName: z.string().trim().min(1, "请填写品牌名称").max(80, "品牌名称不能超过 80 个字符"),
  websiteUrl: optionalUrl,
  storeUrl: optionalUrl,
  industry: z.string().trim().max(80, "行业不能超过 80 个字符").optional().or(z.literal("")),
  productDescription: z.string().trim().max(1200, "主营产品描述不能超过 1200 个字符").optional().or(z.literal("")),
  targetAudience: z.string().trim().max(1200, "目标用户描述不能超过 1200 个字符").optional().or(z.literal("")),
  brandTone: z.string().trim().max(600, "品牌语调不能超过 600 个字符").optional().or(z.literal("")),
  brandKeywords: z.string().trim().max(600, "品牌关键词不能超过 600 个字符").optional().or(z.literal("")),
  forbiddenWords: z.string().trim().max(600, "禁用词不能超过 600 个字符").optional().or(z.literal("")),
  competitorLinks: z.string().trim().max(1200, "竞品链接不能超过 1200 个字符").optional().or(z.literal("")),
  platformPreferences: z.string().trim().max(1200, "平台偏好不能超过 1200 个字符").optional().or(z.literal("")),
});

export type BrandProfileFormValues = z.infer<typeof brandProfileFormSchema>;

export function splitCommaText(value?: string | null) {
  if (!value) return [];

  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function listToCommaText(value?: string[] | null) {
  return value?.join("，") ?? "";
}

export function platformPreferencesToText(value: unknown) {
  if (!value) return "";
  if (Array.isArray(value)) return value.map(String).join("，");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${String(item)}`)
      .join("，");
  }

  return String(value);
}
