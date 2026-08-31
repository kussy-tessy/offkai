import { z } from "zod";
import {
	EventVisibilitySchema,
	isVisibilityAtLeastAsRestricted,
	ParticipationEligibilitySchema,
	PreferenceQuestionTemplateItemSchema,
} from "../../schema";

export const UpdateSeriesQuestionTemplateRequestSchema = z
	.object({
		preferenceQuestions: z.array(PreferenceQuestionTemplateItemSchema),
		askBringingKigurumi: z.boolean(),
		overviewVisibility: EventVisibilitySchema,
		participantsVisibility: EventVisibilitySchema,
		participationEligibility: ParticipationEligibilitySchema,
	})
	.superRefine((value, ctx) => {
		if (value.overviewVisibility === "PARTICIPANTS") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["overviewVisibility"],
				message: "オフ会概要の公開範囲にオフ会参加表明者は指定できません",
			});
		}
		if (
			!isVisibilityAtLeastAsRestricted(
				value.participantsVisibility,
				value.overviewVisibility,
			)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["participantsVisibility"],
				message:
					"参加者一覧・回答の公開範囲は、オフ会概要と同じか、より限定してください",
			});
		}
	});

export type UpdateSeriesQuestionTemplateRequest = z.infer<
	typeof UpdateSeriesQuestionTemplateRequestSchema
>;
