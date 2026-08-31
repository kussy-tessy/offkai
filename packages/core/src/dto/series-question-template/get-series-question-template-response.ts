import { z } from "zod";
import {
	EventVisibilitySchema,
	ParticipationEligibilitySchema,
	PreferenceQuestionTemplateItemSchema,
} from "../../schema";

export const GetSeriesQuestionTemplateResponseSchema = z.object({
	preferenceQuestions: z.array(PreferenceQuestionTemplateItemSchema),
	askBringingKigurumi: z.boolean(),
	overviewVisibility: EventVisibilitySchema,
	participantsVisibility: EventVisibilitySchema,
	participationEligibility: ParticipationEligibilitySchema,
});

export type GetSeriesQuestionTemplateResponse = z.infer<
	typeof GetSeriesQuestionTemplateResponseSchema
>;
