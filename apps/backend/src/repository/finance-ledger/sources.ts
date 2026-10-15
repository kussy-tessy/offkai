import type { Prisma } from "@prisma/client";

export async function readFinanceSources(
	tx: Prisma.TransactionClient,
	eventId: string,
) {
	const [answers, questions] = await Promise.all([
		tx.offkaiAnswer.findMany({
			where: { eventId },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			select: {
				id: true,
				userId: true,
				respondentName: true,
				commitmentAnswers: { select: { questionId: true, answer: true } },
			},
		}),
		tx.commitmentQuestion.findMany({
			where: { eventId },
			orderBy: { sortOrder: "asc" },
			select: { id: true, questionShort: true, archivedAt: true },
		}),
	]);
	return {
		people: answers.map((a) => ({
			id: a.userId ?? a.id,
			name: a.respondentName,
		})),
		questions: questions.map((q) => ({
			id: q.id,
			label: q.questionShort,
			archived: q.archivedAt !== null,
			personIds: answers
				.filter((a) =>
					a.commitmentAnswers.some((c) => c.questionId === q.id && c.answer),
				)
				.map((a) => a.userId ?? a.id)
				.sort(),
		})),
	};
}

export type FinanceSources = Awaited<ReturnType<typeof readFinanceSources>>;
