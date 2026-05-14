import { z } from "zod";
import { ISODateTimeStringSchema, OffkaiEventIdSchema, QuestionIdSchema } from "../../schema";

export const OffkaiEventHeaderSchema = z.object({
  id: OffkaiEventIdSchema,
  title: z.string(),
  eventDate: ISODateTimeStringSchema,
});
export type OffkaiEventHeader = z.infer<typeof OffkaiEventHeaderSchema>;

export const CommitmentQuestionWithAnswerSchema = z.object({
  id: QuestionIdSchema,
  question: z.string(),
  required: z.boolean().default(false),
  deadline: ISODateTimeStringSchema,
  capacity: z.number().nonnegative(),
  currentCount: z.number().nonnegative(),
  canSelectYes: z.boolean(),
  canEdit: z.boolean(),
  disableReason: z.enum(["deadlinePassed", "capacityFull"]).optional(),
  userAnswer: z.enum(["yes", "no"]).nullable(),
});
export type CommitmentQuestionWithAnswer = z.infer<
  typeof CommitmentQuestionWithAnswerSchema
>;

export const PreferenceQuestionWithAnswerSchema = z.object({
  id: QuestionIdSchema,
  question: z.string(),
  required: z.boolean().default(false),
  answerTemplate: z.object({
    type: z.enum(["free", "choices", "choicesIncludingOther"]),
    choices: z.array(z.string()).optional(),
  }),
  userAnswer: z.string().nullable(),
});
export type PreferenceQuestionWithAnswer = z.infer<
  typeof PreferenceQuestionWithAnswerSchema
>;

export const GetMyAnswerFormResponseSchema = z.object({
  event: OffkaiEventHeaderSchema,
  commitmentQuestions: z.array(CommitmentQuestionWithAnswerSchema),
  preferenceQuestions: z.array(PreferenceQuestionWithAnswerSchema),
});
export type GetMyAnswerFormResponse = z.infer<
  typeof GetMyAnswerFormResponseSchema
>;
