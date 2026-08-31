import {
	formatForForm,
	type GetOffkaiEventRequest,
	type OffkaiEventResponse,
	type Unbrand,
	type UserId,
} from "@offkai/core";
import { requireEventPermission } from "../../../authorization/staff-permissions";
import { OffkaiEventRepository } from "../../../repository";

export async function getOffkaiEvent(
	input: GetOffkaiEventRequest,
	userId: UserId,
): Promise<Unbrand<OffkaiEventResponse>> {
	const repository = new OffkaiEventRepository();
	const event = await repository.findById(input.id);
	await requireEventPermission(event.id, userId, { area: "eventManagement" });

	return {
		id: event.id,
		seriesId: event.seriesId,
		title: event.name,
		eventPeriod: {
			startDate: formatForForm(event.eventPeriod.startDate, false),
			endDate: formatForForm(event.eventPeriod.endDate, false),
		},
		applicationStartDate: formatForForm(event.applicationStartDate),
		description: event.description,
		discordRoleId: event.discordRoleId,
		askBringingKigurumi: event.askBringingKigurumi,
		overviewVisibility: event.overviewVisibility,
		participantsVisibility: event.participantsVisibility,
		participationEligibility: event.participationEligibility,
		commitmentQuestions: event.commitmentQuestions.map((question) => ({
			...question,
			deadline: formatForForm(question.deadline),
		})),
		preferenceQuestions: event.preferenceQuestions.map((question) => ({
			...question,
			answerTemplate: question.answerTemplate,
		})),
	};
}
