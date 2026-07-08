import type {
	OffkaiSeriesId,
	PreferenceQuestionTemplateItem,
} from "../schema";

export class SeriesQuestionTemplate {
	private constructor(
		readonly seriesId: OffkaiSeriesId,
		readonly preferenceQuestions: PreferenceQuestionTemplateItem[],
	) {}

	static reconstruct(params: {
		seriesId: OffkaiSeriesId;
		preferenceQuestions: PreferenceQuestionTemplateItem[];
	}): SeriesQuestionTemplate {
		return new SeriesQuestionTemplate(
			params.seriesId,
			params.preferenceQuestions,
		);
	}

	edit(params: {
		preferenceQuestions: PreferenceQuestionTemplateItem[];
	}): SeriesQuestionTemplate {
		return new SeriesQuestionTemplate(
			this.seriesId,
			params.preferenceQuestions,
		);
	}
}
