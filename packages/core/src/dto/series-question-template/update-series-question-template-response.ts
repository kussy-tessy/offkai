import { z } from "zod";
import {
	EventVisibilitySchema,
	ParticipationEligibilitySchema,
	PreferenceQuestionTemplateItemSchema,
} from "../../schema";

export const UpdateSeriesQuestionTemplateResponseSchema = z.object({
	preferenceQuestions: z.array(PreferenceQuestionTemplateItemSchema),
	askBringingKigurumi: z.boolean(),
	overviewVisibility: EventVisibilitySchema,
	participantsVisibility: EventVisibilitySchema,
	participationEligibility: ParticipationEligibilitySchema,
});

export type UpdateSeriesQuestionTemplateResponse = z.infer<
	typeof UpdateSeriesQuestionTemplateResponseSchema
>;
