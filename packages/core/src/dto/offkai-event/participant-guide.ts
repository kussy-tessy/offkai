import { z } from "zod";
import { OffkaiEventIdSchema } from "../../schema";

export const GUIDE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const GUIDE_IMAGE_MAX_COUNT = 20;
export const ParticipantGuideImageSchema = z.object({
	id: z.string().uuid(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	url: z.string().url(),
});
export type ParticipantGuideImage = z.infer<typeof ParticipantGuideImageSchema>;
export const ParticipantGuideImageParamsSchema = z.object({
	eventId: OffkaiEventIdSchema,
	imageId: z.string().uuid(),
});

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
	description: z.string().max(10000),
});
export type UpdateParticipantGuideRequest = z.infer<
	typeof UpdateParticipantGuideRequestSchema
>;
