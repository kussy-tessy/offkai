import { v7 as uuidv7 } from "uuid";
import type {
	ApplicationStartDate,
	CommitmentQuestion,
	DiscordRoleId,
	EventPeriod,
	EventVisibility,
	OffkaiEventId,
	OffkaiSeriesId,
	ParticipationEligibility,
	PreferenceQuestion,
	QuestionId,
} from "../schema";
import { isPassed } from "../util";

export class OffkaiEvent {
	private constructor(
		readonly id: OffkaiEventId,
		readonly seriesId: OffkaiSeriesId,
		readonly name: string,
		readonly eventPeriod: EventPeriod,
		readonly description: string,
		readonly participantDescription: string,
		readonly applicationStartDate: ApplicationStartDate,
		readonly discordRoleId: DiscordRoleId | null,
		readonly askBringingKigurumi: boolean,
		readonly overviewVisibility: EventVisibility,
		readonly participantsVisibility: EventVisibility,
		readonly participationEligibility: ParticipationEligibility,
		readonly commitmentQuestions: CommitmentQuestion[],
		readonly preferenceQuestions: PreferenceQuestion[],
	) {}

	static reconstruct(params: {
		id: OffkaiEventId;
		seriesId: OffkaiSeriesId;
		name: string;
		eventPeriod: EventPeriod;
		description: string;
		participantDescription?: string;
		applicationStartDate: ApplicationStartDate;
		discordRoleId: DiscordRoleId | null;
		askBringingKigurumi?: boolean;
		overviewVisibility?: EventVisibility;
		participantsVisibility?: EventVisibility;
		participationEligibility?: ParticipationEligibility;
		commitmentQuestions: CommitmentQuestion[];
		preferenceQuestions: PreferenceQuestion[];
	}) {
		return new OffkaiEvent(
			params.id,
			params.seriesId,
			params.name,
			params.eventPeriod,
			params.description,
			params.participantDescription ?? "",
			params.applicationStartDate,
			params.discordRoleId,
			params.askBringingKigurumi ?? false,
			params.overviewVisibility ?? "AUTHENTICATED",
			params.participantsVisibility ?? "AUTHENTICATED",
			params.participationEligibility ?? "AUTHENTICATED",
			params.commitmentQuestions,
			params.preferenceQuestions,
		);
	}

	static create(params: {
		seriesId: OffkaiSeriesId;
		name: string;
		eventPeriod: EventPeriod;
		description: string;
		applicationStartDate: ApplicationStartDate;
		discordRoleId?: DiscordRoleId | null;
		askBringingKigurumi?: boolean;
		overviewVisibility?: EventVisibility;
		participantsVisibility?: EventVisibility;
		participationEligibility?: ParticipationEligibility;
		commitmentQuestions: Omit<CommitmentQuestion, "id">[];
		preferenceQuestions: Omit<PreferenceQuestion, "id">[];
	}): OffkaiEvent {
		if (isPassed(new Date(), params.eventPeriod.startDate)) {
			throw new Error("すでに開催日を過ぎています");
		}
		return new OffkaiEvent(
			uuidv7() as OffkaiEventId,
			params.seriesId,
			params.name,
			params.eventPeriod,
			params.description,
			"",
			params.applicationStartDate,
			params.discordRoleId ?? null,
			params.askBringingKigurumi ?? false,
			params.overviewVisibility ?? "AUTHENTICATED",
			params.participantsVisibility ?? "AUTHENTICATED",
			params.participationEligibility ?? "AUTHENTICATED",
			params.commitmentQuestions.map((question) => ({
				...question,
				id: uuidv7() as QuestionId,
			})),
			params.preferenceQuestions.map((question) => ({
				...question,
				id: uuidv7() as QuestionId,
			})),
		);
	}

	edit(params: {
		name: string;
		eventPeriod: EventPeriod;
		description: string;
		applicationStartDate: ApplicationStartDate;
		discordRoleId?: DiscordRoleId | null;
		askBringingKigurumi?: boolean;
		overviewVisibility: EventVisibility;
		participantsVisibility: EventVisibility;
		participationEligibility: ParticipationEligibility;
		commitmentQuestions: CommitmentQuestion[];
		preferenceQuestions: PreferenceQuestion[];
	}): OffkaiEvent {
		if (isPassed(new Date(), params.eventPeriod.startDate)) {
			throw new Error("すでに開催日を過ぎています");
		}
		return new OffkaiEvent(
			this.id,
			this.seriesId,
			params.name,
			params.eventPeriod,
			params.description,
			this.participantDescription,
			params.applicationStartDate,
			params.discordRoleId ?? this.discordRoleId,
			params.askBringingKigurumi ?? this.askBringingKigurumi,
			params.overviewVisibility,
			params.participantsVisibility,
			params.participationEligibility,
			params.commitmentQuestions,
			params.preferenceQuestions,
		);
	}

	updateParticipantDescription(description: string): OffkaiEvent {
		return new OffkaiEvent(
			this.id,
			this.seriesId,
			this.name,
			this.eventPeriod,
			this.description,
			description,
			this.applicationStartDate,
			this.discordRoleId,
			this.askBringingKigurumi,
			this.overviewVisibility,
			this.participantsVisibility,
			this.participationEligibility,
			this.commitmentQuestions,
			this.preferenceQuestions,
		);
	}
}
