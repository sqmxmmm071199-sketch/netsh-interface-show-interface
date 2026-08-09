import { AssetStatus } from "@prisma/client";
import { z } from "zod";

export const updateAssetStatusSchema = z.object({
  status: z.nativeEnum(AssetStatus),
});
