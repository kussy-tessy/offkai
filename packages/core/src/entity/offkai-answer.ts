import { v7 as uuidv7 } from "uuid";
import type {
	AnswerId,
	CommitmentAnswer,
	CommitmentQuestion,
	OffkaiEventId,
	PreferenceAnswer,
	PreferenceQuestion,
	UserId,
} from "../schema/index.js";

type Params = {
	answer: {
		commitmentAnswers: CommitmentAnswer[];
		preferenceAnswers: PreferenceAnswer[];
	};
	question: {
		eventId: OffkaiEventId;
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
	) {}

	static reconstruct(params: {
		id: AnswerId;
		eventId: OffkaiEventId;
		userId: UserId;
		commitmentAnswers: CommitmentAnswer[];
		preferenceAnswers: PreferenceAnswer[];
	}) {
		return new OffkaiAnswer(
			params.id,
			params.eventId,
			params.userId,
			params.commitmentAnswers,
			params.preferenceAnswers,
		);
	}

	static create(params: Params & { userId: UserId }) {
		OffkaiAnswer.validateAnswer(params);

		return new OffkaiAnswer(
			uuidv7() as AnswerId,
			params.question.eventId,
			params.userId,
			params.answer.commitmentAnswers,
			params.answer.preferenceAnswers,
		);
	}

	edit(params: Params) {
		OffkaiAnswer.validateAnswer(params, this.commitmentAnswers);

		return new OffkaiAnswer(
			this.id,
			this.eventId,
			this.userId,
			params.answer.commitmentAnswers,
			params.answer.preferenceAnswers,
		);
	}

	forceEdit(params: Params) {
		return new OffkaiAnswer(
			this.id,
			this.eventId,
			this.userId,
			params.answer.commitmentAnswers,
			params.answer.preferenceAnswers,
		);
	}

	private static validateAnswer(
		params: Params,
		nowAnswers?: CommitmentAnswer[],
		now: Date = new Date(),
	) {
		// QuestionとAnswerのidが1対1対応であることを確認
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
				isSameSet(commitmentQuestionIds, commitmentAnswerIds) &&
				isSameSet(preferenceQuestionIds, preferenceAnswerIds)
			)
		) {
			throw new Error(
				"アンケートと回答が対応していません。アンケートが更新された可能性があるので、再度画面を読み込み直して回答し直してください。",
			);
		}

		// 質問ごとにチェック
		for (const question of params.question.commitmentQuestions) {
			const answer = params.answer.commitmentAnswers.find(
				(a) => a.questionId === question.id,
			);

			// 上で一致チェックしているのでありえない
			if (!answer) {
				throw new Error("予期せぬエラー");
			}

			// yesの場合
			if (answer.answer === "yes") {
				if (now > question.deadline) {
					throw new Error("締切を過ぎています。");
				}
				if (question.numberOfPeople + 1 > question.capacity) {
					throw new Error("締切人数に到達しました。");
				}
			}

			// 締め切りを過ぎてcommitmentの回答を変更するのはだめ
			if (!nowAnswers) continue;
			const nowAnswer = nowAnswers.find((a) => a.questionId === question.id);
			if (nowAnswer) {
				if (nowAnswer.answer !== answer.answer && now > question.deadline) {
					throw new Error("締切を過ぎてから参加可否は変更できません。");
				}
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
