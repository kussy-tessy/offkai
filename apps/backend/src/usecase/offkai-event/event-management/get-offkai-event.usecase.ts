import {
  format,
  type GetOffkaiEventRequest,
  type OffkaiEventResponse,
  type Unbrand,
	type UserId,
} from "@offkai/core";
import { AppError } from "../../../app-error";
import { hasSeriesRole } from "../../../authorization/event-access";
import { OffkaiEventRepository } from "../../../repository";

export async function getOffkaiEvent(
  input: GetOffkaiEventRequest,
	userId: UserId,
): Promise<Unbrand<OffkaiEventResponse>> {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(input.id);
	const seriesRole = await repository.findSeriesMemberRole(userId, event.seriesId);
	if (!hasSeriesRole(seriesRole, "owner")) {
		throw new AppError("FORBIDDEN", "このオフ会を編集する権限がありません。");
	}

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
		overviewVisibility: event.overviewVisibility,
		participantsVisibility: event.participantsVisibility,
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
