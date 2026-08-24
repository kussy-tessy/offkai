import type {
	AnswerId,
	BringingKigurumi,
	CommitmentAnswer,
	CommitmentQuestion,
	OffkaiEventId,
	PreferenceAnswer,
	UserId,
} from "@offkai/core";
import { OffkaiAnswer } from "@offkai/core";
import { AppError, runBusinessRule } from "../app-error";
import { hasSeriesRole } from "../authorization/event-access";
import { OffkaiAnswerRepository, OffkaiEventRepository } from "../repository";
import {
	rejectBeforeApplicationStart,
	rejectNewParticipationBeforeApplicationStart,
} from "../usecase/offkai-event/answer-command/application-start";

export class OffkaiAnswerService {
	async prepareAnswerEntity(
		eventId: OffkaiEventId,
		userId: UserId,
		commitmentAnswers: CommitmentAnswer[],
		preferenceAnswers: PreferenceAnswer[],
		bringingKigurumis: BringingKigurumi[],
	): Promise<OffkaiAnswer> {
		const eventRepository = new OffkaiEventRepository();
		const event = await eventRepository.findById(eventId);
		const seriesRole = await eventRepository.findSeriesMemberRole(
			userId,
			event.seriesId,
		);
		const answerRepository = new OffkaiAnswerRepository();
		const existing = await answerRepository.findByEventAndUser(
			event.id,
			userId,
		);
		const isOwner = hasSeriesRole(seriesRole, "owner");
		if (!isOwner) {
			if (existing) {
				rejectNewParticipationBeforeApplicationStart(
					event,
					existing.commitmentAnswers,
					commitmentAnswers,
				);
			} else {
				rejectBeforeApplicationStart(event);
			}
		}

		const commitmentQuestionsWithCount =
			await this.getCommitmentQuestionsWithCount(
				event.id,
				event.commitmentQuestions,
				userId,
			);

		const params = {
			answer: {
				commitmentAnswers,
				preferenceAnswers,
				bringingKigurumis: event.askBringingKigurumi ? bringingKigurumis : [],
			},
			question: {
				eventId: event.id,
				askBringingKigurumi: event.askBringingKigurumi,
				commitmentQuestions: commitmentQuestionsWithCount,
				preferenceQuestions: event.preferenceQuestions,
			},
		};

		return runBusinessRule(() => {
			if (isOwner) {
				return existing
					? existing.forceEdit(params)
					: OffkaiAnswer.forceCreate({ ...params, userId });
			}
			return existing
				? existing.edit(params)
				: OffkaiAnswer.create({ ...params, userId });
		});
	}

	async prepareForcedEditAnswerEntity(
		eventId: OffkaiEventId,
		answerUserId: UserId,
		commitmentAnswers: CommitmentAnswer[],
		preferenceAnswers: PreferenceAnswer[],
		bringingKigurumis: BringingKigurumi[],
	): Promise<OffkaiAnswer> {
		const event = await new OffkaiEventRepository().findById(eventId);
		const existing = await new OffkaiAnswerRepository().findByEventAndUser(
			event.id,
			answerUserId,
		);

		if (!existing) {
			throw new AppError(
				"ANSWER_NOT_FOUND",
				"編集対象の回答が見つかりません。",
			);
		}

		return runBusinessRule(() =>
			existing.forceEdit({
				answer: {
					commitmentAnswers,
					preferenceAnswers,
					bringingKigurumis: event.askBringingKigurumi ? bringingKigurumis : [],
				},
				question: {
					eventId: event.id,
					askBringingKigurumi: event.askBringingKigurumi,
					commitmentQuestions: event.commitmentQuestions.map((question) => ({
						...question,
						numberOfPeople: 0,
					})),
					preferenceQuestions: event.preferenceQuestions,
				},
			}),
		);
	}

	async prepareGuestAnswerEntity(
		eventId: OffkaiEventId,
		respondentName: string,
		commitmentAnswers: CommitmentAnswer[],
		preferenceAnswers: PreferenceAnswer[],
		bringingKigurumis: BringingKigurumi[],
		answerId?: AnswerId,
	): Promise<OffkaiAnswer> {
		const event = await new OffkaiEventRepository().findById(eventId);
		const repository = new OffkaiAnswerRepository();
		const existing = answerId ? await repository.findById(answerId) : null;
		if (
			existing &&
			(existing.eventId !== eventId || existing.userId !== null)
		) {
			throw new AppError(
				"ANSWER_NOT_FOUND",
				"編集対象のゲスト回答が見つかりません。",
			);
		}
		const params = {
			answer: {
				commitmentAnswers,
				preferenceAnswers,
				bringingKigurumis: event.askBringingKigurumi ? bringingKigurumis : [],
			},
			question: {
				eventId: event.id,
				askBringingKigurumi: event.askBringingKigurumi,
				commitmentQuestions: event.commitmentQuestions.map((question) => ({
					...question,
					numberOfPeople: 0,
				})),
				preferenceQuestions: event.preferenceQuestions,
			},
		};
		return runBusinessRule(() =>
			existing
				? OffkaiAnswer.reconstruct({
						...existing,
						respondentName: respondentName.trim(),
					}).forceEdit(params)
				: OffkaiAnswer.forceCreateGuest({ ...params, respondentName }),
		);
	}

	private async getCommitmentQuestionsWithCount(
		eventId: OffkaiEventId,
		commitmentQuestions: CommitmentQuestion[],
		userId: UserId,
	) {
		const answerRepository = new OffkaiAnswerRepository();
		const allAnswers = await answerRepository.findManyByEventId(eventId);

		const counts = new Map<string, number>();
		for (const question of commitmentQuestions) {
			counts.set(question.id, 0);
		}

		for (const record of allAnswers) {
			if (record.userId === userId) continue;

			for (const answer of record.commitmentAnswers) {
				if (answer.answer !== "yes") continue;
				const current = counts.get(answer.questionId) ?? 0;
				counts.set(answer.questionId, current + 1);
			}
		}

		return commitmentQuestions.map((question) => ({
			...question,
			numberOfPeople: counts.get(question.id) ?? 0,
		}));
	}
}
