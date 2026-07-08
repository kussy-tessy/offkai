import { z } from "zod";
import { KigurumiIdSchema, KigurumiSchema } from "../../schema";

export const CreateKigurumiRequestSchema = KigurumiSchema.pick({
	title: true,
	character: true,
});
export type CreateKigurumiRequest = z.infer<typeof CreateKigurumiRequestSchema>;

export const KigurumiRouteParamsSchema = z.object({
	kigurumiId: KigurumiIdSchema,
});
export type KigurumiRouteParams = z.infer<typeof KigurumiRouteParamsSchema>;

export const KigurumiResponseSchema = KigurumiSchema;
export type KigurumiResponse = z.infer<typeof KigurumiResponseSchema>;

export const KigurumiListResponseSchema = z.array(KigurumiSchema);
export type KigurumiListResponse = z.infer<typeof KigurumiListResponseSchema>;
