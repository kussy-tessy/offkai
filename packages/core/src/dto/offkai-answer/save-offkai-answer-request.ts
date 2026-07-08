import { z } from "zod";
import {
  BringingKigurumiSchema,
  CommitmentAnswerSchema,
  OffkaiEventIdSchema,
  PreferenceAnswerSchema,
} from "../../schema";

export const SaveOffkaiAnswerRequestSchema = z.object({
  eventId: OffkaiEventIdSchema,
  commitmentAnswers: z.array(CommitmentAnswerSchema),
  preferenceAnswers: z.array(PreferenceAnswerSchema),
  bringingKigurumis: z.array(BringingKigurumiSchema).default([]),
});

export type SaveOffkaiAnswerRequest = z.infer<
  typeof SaveOffkaiAnswerRequestSchema
>;
