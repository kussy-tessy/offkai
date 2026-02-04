import { format, GetOffkaiEventRequest, type OffkaiEventResponse, type Unbrand } from "@offkai/core";
import { OffkaiEventRepository } from "../../repository";

export async function getOffkaiEvent(input: GetOffkaiEventRequest) {
  const event = await new OffkaiEventRepository().findById(input.id);
  if (!event) throw new Error(`OffkaiEvent not found: ${input.id}`);
  return {
    id: event.id,
    seriesId: event.seriesId,
    title: event.name,
    eventDate: format(event.eventDate, false),
    applicationStartDate: format(event.applicationStartDate),
    description: event.description,
    commitmentQuestions: event.commitmentQuestions.map((question) => ({
      ...question,
      deadline: format(question.deadline),
    })),
    preferenceQuestions: event.preferenceQuestions.map((question) => ({
      ...question,
      answer: {
        type: question.answer.type,
        choices:
          question.answer.type === "choices"
            ? question.answer.choices
            : undefined
      }
    })),
  } as Unbrand<OffkaiEventResponse>;
}
