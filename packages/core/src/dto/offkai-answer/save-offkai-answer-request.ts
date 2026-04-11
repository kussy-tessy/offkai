import { z } from "zod";
import {
  CommitmentAnswerSchema,
  OffkaiEventIdSchema,
  PreferenceAnswerSchema,
} from "../../schema";

export const SaveOffkaiAnswerRequestSchema = z.object({
  eventId: OffkaiEventIdSchema,
  commitmentAnswers: z.array(CommitmentAnswerSchema),
  preferenceAnswers: z.array(PreferenceAnswerSchema),
});

export type SaveOffkaiAnswerRequest = z.infer<
  typeof SaveOffkaiAnswerRequestSchema
>;
