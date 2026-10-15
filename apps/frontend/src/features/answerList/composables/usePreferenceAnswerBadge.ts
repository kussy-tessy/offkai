import type { PreferenceQuestionHeader, Unbrand } from "@offkai/core";
import { type ComputedRef, computed } from "vue";
import type { BadgeColor } from "@/common/components/MyBadge.colors";

type PreferenceQuestion = Unbrand<PreferenceQuestionHeader>;

// 選択肢が増えた場合も、隣り合う色が似すぎない順序にしている。
const ANSWER_BADGE_COLORS = [
	"red",
	"blue",
	"yellow",
	"green",
	"orange",
	"cyan",
	"pink",
	"purple",
	"lime",
	"indigo",
	"white",
	"black",
] as const;

const OTHER_ANSWER_PREFIX = "その他: ";

export function usePreferenceAnswerBadge(
	question: ComputedRef<PreferenceQuestion | null>,
) {
	const isChoiceQuestion = computed(
		() =>
			question.value !== null && question.value.answerTemplate.type !== "free",
	);

	const badgeColor = (answer: string): BadgeColor => {
		const template = question.value?.answerTemplate;
		if (!template || template.type === "free") return "gray";

		const choiceIndex = answer.startsWith(OTHER_ANSWER_PREFIX)
			? template.choices.length
			: template.choices.indexOf(answer);
		const colorIndex =
			choiceIndex >= 0 ? choiceIndex : ANSWER_BADGE_COLORS.length - 1;

		return ANSWER_BADGE_COLORS[colorIndex % ANSWER_BADGE_COLORS.length];
	};

	return { isChoiceQuestion, badgeColor };
}
