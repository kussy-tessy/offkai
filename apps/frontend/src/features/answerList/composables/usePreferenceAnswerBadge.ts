import type { PreferenceQuestionHeader, Unbrand } from "@offkai/core";
import { type ComputedRef, computed } from "vue";

type PreferenceQuestion = Unbrand<PreferenceQuestionHeader>;

// 選択肢が増えた場合も、隣り合う色が似すぎない順序にしている。
const ANSWER_BADGE_CLASSES = [
	"border-rose-200 bg-rose-100 text-rose-800",
	"border-sky-200 bg-sky-100 text-sky-800",
	"border-amber-200 bg-amber-100 text-amber-800",
	"border-emerald-200 bg-emerald-100 text-emerald-800",
	"border-orange-200 bg-orange-100 text-orange-800",
	"border-cyan-200 bg-cyan-100 text-cyan-800",
	"border-pink-200 bg-pink-100 text-pink-800",
	"border-violet-200 bg-violet-100 text-violet-800",
	"border-lime-200 bg-lime-100 text-lime-800",
	"border-indigo-200 bg-indigo-100 text-indigo-800",
	"border-slate-300 bg-white text-slate-800",
	"border-slate-900 bg-slate-900 text-white",
] as const;

const OTHER_ANSWER_PREFIX = "その他: ";

export function usePreferenceAnswerBadge(
	question: ComputedRef<PreferenceQuestion | null>,
) {
	const isChoiceQuestion = computed(
		() =>
			question.value !== null && question.value.answerTemplate.type !== "free",
	);

	const badgeClass = (answer: string) => {
		const template = question.value?.answerTemplate;
		if (!template || template.type === "free") return "";

		const choiceIndex = answer.startsWith(OTHER_ANSWER_PREFIX)
			? template.choices.length
			: template.choices.indexOf(answer);
		const colorIndex =
			choiceIndex >= 0 ? choiceIndex : ANSWER_BADGE_CLASSES.length - 1;

		return ANSWER_BADGE_CLASSES[colorIndex % ANSWER_BADGE_CLASSES.length];
	};

	return { isChoiceQuestion, badgeClass };
}
