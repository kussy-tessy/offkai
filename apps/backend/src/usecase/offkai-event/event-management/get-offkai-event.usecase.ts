import {
  format,
  type GetOffkaiEventRequest,
  type OffkaiEventResponse,
  type Unbrand,
} from "@offkai/core";
import { OffkaiEventRepository } from "../../../repository";

export async function getOffkaiEvent(
  input: GetOffkaiEventRequest,
): Promise<Unbrand<OffkaiEventResponse>> {
  const event = await new OffkaiEventRepository().findById(input.id);
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
      answerTemplate: question.answerTemplate,
    })),
  };
}
