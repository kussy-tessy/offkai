import type {
	EventVisibility,
	OffkaiSeriesId,
	ParticipationEligibility,
	PreferenceQuestionTemplateItem,
} from "../schema";

export class SeriesQuestionTemplate {
	private constructor(
		readonly seriesId: OffkaiSeriesId,
		readonly preferenceQuestions: PreferenceQuestionTemplateItem[],
		readonly askBringingKigurumi: boolean,
		readonly overviewVisibility: EventVisibility,
		readonly participantsVisibility: EventVisibility,
		readonly participationEligibility: ParticipationEligibility,
	) {}

	static reconstruct(params: {
		seriesId: OffkaiSeriesId;
		preferenceQuestions: PreferenceQuestionTemplateItem[];
		askBringingKigurumi: boolean;
		overviewVisibility: EventVisibility;
		participantsVisibility: EventVisibility;
		participationEligibility: ParticipationEligibility;
	}): SeriesQuestionTemplate {
		return new SeriesQuestionTemplate(
			params.seriesId,
			params.preferenceQuestions,
			params.askBringingKigurumi,
			params.overviewVisibility,
			params.participantsVisibility,
			params.participationEligibility,
		);
	}

	edit(params: {
		preferenceQuestions: PreferenceQuestionTemplateItem[];
		askBringingKigurumi: boolean;
		overviewVisibility: EventVisibility;
		participantsVisibility: EventVisibility;
		participationEligibility: ParticipationEligibility;
	}): SeriesQuestionTemplate {
		return new SeriesQuestionTemplate(
			this.seriesId,
			params.preferenceQuestions,
			params.askBringingKigurumi,
			params.overviewVisibility,
			params.participantsVisibility,
			params.participationEligibility,
		);
	}
}
