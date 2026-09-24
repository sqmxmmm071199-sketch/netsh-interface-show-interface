import { AssetStatus } from "@prisma/client";
import { z } from "zod";

export const updateAssetStatusSchema = z.object({
  status: z.nativeEnum(AssetStatus),
});

export const updateAssetTagsSchema = z.object({
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(20)
    .default([]),
});
