import { v7 as uuidv7 } from "uuid";
import {
	BringingKigurumiSchema,
	CommitmentAnswerSchema,
	PreferenceAnswerSchema,
} from "../schema";
import type {
	AnswerId,
	BringingKigurumi,
	CommitmentAnswer,
	CommitmentQuestion,
	OffkaiEventId,
	PreferenceAnswer,
	PreferenceQuestion,
	UserId,
} from "../schema";

type Params = {
	answer: {
		commitmentAnswers: CommitmentAnswer[];
		preferenceAnswers: PreferenceAnswer[];
		bringingKigurumis: BringingKigurumi[];
	};
	question: {
		eventId: OffkaiEventId;
		askBringingKigurumi: boolean;
		commitmentQuestions: (CommitmentQuestion & { numberOfPeople: number })[];
		preferenceQuestions: PreferenceQuestion[];
	};
};

export class OffkaiAnswer {
	private constructor(
		readonly id: AnswerId,
		readonly eventId: OffkaiEventId,
		readonly userId: UserId,
		readonly commitmentAnswers: CommitmentAnswer[],
		readonly preferenceAnswers: PreferenceAnswer[],
		readonly bringingKigurumis: BringingKigurumi[],
	) {}

	static reconstruct(params: {
		id: AnswerId;
		eventId: OffkaiEventId;
		userId: UserId;
		commitmentAnswers: CommitmentAnswer[];
		preferenceAnswers: PreferenceAnswer[];
		bringingKigurumis?: BringingKigurumi[];
	}) {
		return new OffkaiAnswer(
			params.id,
			params.eventId,
			params.userId,
			params.commitmentAnswers,
			params.preferenceAnswers,
			params.bringingKigurumis ?? [],
		);
	}

	static create(params: Params & { userId: UserId }) {
		OffkaiAnswer.validateAnswerStructure(params);
		OffkaiAnswer.validateAnswerBusinessRules(params);

		return new OffkaiAnswer(
			uuidv7() as AnswerId,
			params.question.eventId,
			params.userId,
			params.answer.commitmentAnswers,
			params.answer.preferenceAnswers,
			params.answer.bringingKigurumis,
		);
	}

	edit(params: Params) {
		OffkaiAnswer.validateAnswerStructure(params);
		OffkaiAnswer.validateAnswerBusinessRules(params, this.commitmentAnswers);

		return new OffkaiAnswer(
			this.id,
			this.eventId,
			this.userId,
			params.answer.commitmentAnswers,
			params.answer.preferenceAnswers,
			params.answer.bringingKigurumis,
		);
	}

	forceEdit(params: Params) {
		OffkaiAnswer.validateAnswerStructure(params);

		return new OffkaiAnswer(
			this.id,
			this.eventId,
			this.userId,
			params.answer.commitmentAnswers,
			params.answer.preferenceAnswers,
			params.answer.bringingKigurumis,
		);
	}

	private static validateAnswerStructure(params: Params) {
		CommitmentAnswerSchema.array().parse(params.answer.commitmentAnswers);
		PreferenceAnswerSchema.array().parse(params.answer.preferenceAnswers);
		BringingKigurumiSchema.array().parse(params.answer.bringingKigurumis);

		const commitmentQuestionIds = new Set(
			params.question.commitmentQuestions.map((question) => question.id),
		);
		const commitmentAnswerIds = new Set(
			params.answer.commitmentAnswers.map((answer) => answer.questionId),
		);
		const preferenceQuestionIds = new Set(
			params.question.preferenceQuestions.map((question) => question.id),
		);
		const preferenceAnswerIds = new Set(
			params.answer.preferenceAnswers.map((answer) => answer.questionId),
		);

		if (
			!(
				params.question.commitmentQuestions.length ===
					commitmentQuestionIds.size &&
				params.answer.commitmentAnswers.length === commitmentAnswerIds.size &&
				params.question.preferenceQuestions.length ===
					preferenceQuestionIds.size &&
				params.answer.preferenceAnswers.length === preferenceAnswerIds.size &&
				isSameSet(commitmentQuestionIds, commitmentAnswerIds) &&
				isSameSet(preferenceQuestionIds, preferenceAnswerIds)
			)
		) {
			throw new Error(
				"アンケートと回答が対応していません。アンケートが更新された可能性があるので、再度画面を読み込み直して回答し直してください。",
			);
		}
	}

	private static validateAnswerBusinessRules(
		params: Params,
		nowAnswers?: CommitmentAnswer[],
		now: Date = new Date(),
	) {
		for (const question of params.question.commitmentQuestions) {
			const answer = params.answer.commitmentAnswers.find(
				(a) => a.questionId === question.id,
			);

			if (!answer) {
				throw new Error("予期せぬエラー");
			}

			const isAnswerUnavailable =
				now > question.deadline ||
				question.numberOfPeople >= question.capacity;

			if (question.required && answer.answer === null && !isAnswerUnavailable) {
				throw new Error("必須の参加可否を選択してください。");
			}

			const nowAnswer = nowAnswers?.find((a) => a.questionId === question.id);
			const isAnswerChanged = nowAnswer
				? nowAnswer.answer !== answer.answer
				: true;
			const decreasesParticipation =
				nowAnswer?.answer === "yes" && answer.answer !== "yes";

			if (!nowAnswer && answer.answer !== null && now > question.deadline) {
				throw new Error("締切を過ぎています。");
			}

			if (
				isAnswerChanged &&
				question.numberOfPeople >= question.capacity &&
				!decreasesParticipation &&
				(nowAnswer !== undefined || answer.answer !== null)
			) {
				throw new Error("締切人数に到達しました。");
			}

			if (nowAnswer && isAnswerChanged && now > question.deadline) {
				throw new Error("締切を過ぎてから参加可否は変更できません。");
			}

			if (answer.answer === "yes" && isAnswerChanged) {
				if (now > question.deadline) {
					throw new Error("締切を過ぎています。");
				}
				if (question.numberOfPeople + 1 > question.capacity) {
					throw new Error("締切人数に到達しました。");
				}
			}
		}

		for (const question of params.question.preferenceQuestions) {
			const answer = params.answer.preferenceAnswers.find(
				(a) => a.questionId === question.id,
			);

			if (!answer) {
				throw new Error("予期せぬエラー");
			}

			if (!question.required) continue;

			const value = (answer.answer ?? "").trim();
			if (value.length === 0) {
				throw new Error("必須のアンケートを入力してください。");
			}
		}
	}
}

function isSameSet<T>(a: Set<T>, b: Set<T>): boolean {
	if (a.size !== b.size) return false;
	for (const v of a) {
		if (!b.has(v)) return false;
	}
	return true;
}
