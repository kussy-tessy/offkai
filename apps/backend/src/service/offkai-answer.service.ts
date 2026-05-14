import type {
  CommitmentAnswer,
  CommitmentQuestion,
  OffkaiEventId,
  PreferenceAnswer,
  UserId,
} from "@offkai/core";
import { OffkaiAnswer } from "@offkai/core";
import { OffkaiAnswerRepository, OffkaiEventRepository } from "../repository";

export class OffkaiAnswerService {
  async prepareAnswerEntity(
    eventId: OffkaiEventId,
    userId: UserId,
    commitmentAnswers: CommitmentAnswer[],
    preferenceAnswers: PreferenceAnswer[],
  ): Promise<OffkaiAnswer> {
    // イベント取得
    const event = await new OffkaiEventRepository().findById(eventId);
    if (!event) {
      throw new Error(`オフ会が見つかりません: ${eventId}`);
    }

    // 既存回答確認
    const answerRepository = new OffkaiAnswerRepository();
    const existing = await answerRepository.findByEventAndUser(event.id, userId);

    // 他のユーザーの回答を集計して参加数を計算
    const commitmentQuestionsWithCount =
      await this.getCommitmentQuestionsWithCount(
        event.id,
        event.commitmentQuestions,
        userId,
      );

    // OffkaiAnswer エンティティ作成/編集
    const params = {
      answer: {
        commitmentAnswers,
        preferenceAnswers,
      },
      question: {
        eventId: event.id,
        commitmentQuestions: commitmentQuestionsWithCount,
        preferenceQuestions: event.preferenceQuestions,
      },
    };

    return existing
      ? existing.edit(params)
      : OffkaiAnswer.create({ ...params, userId });
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
      // 自分の回答は除外
      if (record.userId === userId) continue;

      const answers = record.commitmentAnswers as unknown as {
        questionId: string;
        answer: "yes" | "no" | null;
      }[];

      for (const answer of answers) {
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
