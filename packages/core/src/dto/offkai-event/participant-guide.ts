import { z } from "zod";
import { OffkaiEventIdSchema } from "../../schema";

export const ParticipantGuideRouteParamsSchema = z.object({
	eventId: OffkaiEventIdSchema,
});
export type ParticipantGuideRouteParams = z.infer<
	typeof ParticipantGuideRouteParamsSchema
>;

export const ParticipantGuideResponseSchema = z.object({
	description: z.string(),
});
export type ParticipantGuideResponse = z.infer<
	typeof ParticipantGuideResponseSchema
>;

export const UpdateParticipantGuideRequestSchema = z.object({
	eventId: OffkaiEventIdSchema,
	description: z.string().max(1000),
});
export type UpdateParticipantGuideRequest = z.infer<
	typeof UpdateParticipantGuideRequestSchema
>;
