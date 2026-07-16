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
    eventPeriod: {
      startDate: format(event.eventPeriod.startDate, false),
      endDate: format(event.eventPeriod.endDate, false),
    },
    applicationStartDate: format(event.applicationStartDate),
    description: event.description,
    discordRoleId: event.discordRoleId,
    askBringingKigurumi: event.askBringingKigurumi,
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
