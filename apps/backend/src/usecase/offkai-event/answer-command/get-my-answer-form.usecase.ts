import type {
  GetMyAnswerFormRequest,
  GetMyAnswerFormResponse,
  Unbrand,
  UserId,
} from "@offkai/core";
import { isPassed } from "@offkai/core";
import { OffkaiAnswerRepository, OffkaiEventRepository } from "../../../repository";

export async function getMyAnswerForm(
  input: GetMyAnswerFormRequest,
  userId: UserId,
): Promise<Unbrand<GetMyAnswerFormResponse>> {
  const event = await new OffkaiEventRepository().findById(input.eventId);

  const answerRepository = new OffkaiAnswerRepository();
  const [allAnswers, myAnswer] = await Promise.all([
    answerRepository.findManyByEventId(input.eventId),
    answerRepository.findByEventAndUser(input.eventId, userId),
  ]);

  // 自分を除いた各 commitment question の "yes" 数を集計
  const counts = new Map<string, number>();
  for (const question of event.commitmentQuestions) {
    counts.set(question.id, 0);
  }
  for (const record of allAnswers) {
    if (record.userId === userId) continue;
    const answers = record.commitmentAnswers as Array<{
      questionId: string;
      answer: "yes" | "no";
    }>;
    for (const answer of answers) {
      if (answer.answer !== "yes") continue;
      counts.set(answer.questionId, (counts.get(answer.questionId) ?? 0) + 1);
    }
  }

  const now = new Date();

  const commitmentQuestions = event.commitmentQuestions.map((q) => {
    const currentCount = counts.get(q.id) ?? 0;
    const deadlinePassed = isPassed(now, q.deadline);
    const canEdit = !deadlinePassed;
    const canSelectYes = currentCount < q.capacity;
    const disableReason = !canEdit
      ? ("deadlinePassed" as const)
      : !canSelectYes
        ? ("capacityFull" as const)
        : undefined;
    const userAnswer =
      myAnswer?.commitmentAnswers.find((a) => a.questionId === q.id)?.answer ??
      null;

    return {
      id: q.id,
      question: q.question,
      deadline: q.deadline.toISOString().split("T")[0],
      capacity: q.capacity,
      currentCount,
      canSelectYes,
      canEdit,
      disableReason,
      userAnswer,
    };
  });

  const preferenceQuestions = event.preferenceQuestions.map((q) => {
    const userAnswer =
      myAnswer?.preferenceAnswers.find((a) => a.questionId === q.id)?.answer ??
      null;

    return {
      id: q.id,
      question: q.question,
      answer: q.answer,
      userAnswer,
    };
  });

  return { commitmentQuestions, preferenceQuestions };
}
