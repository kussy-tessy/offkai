import {
	AnswerIdSchema,
	OffkaiAnswer,
	OffkaiEventIdSchema,
	SaveOffkaiAnswerRequestSchema,
	UserIdSchema,
} from "@offkai/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
	offkaiAnswer: { findFirst: vi.fn(), upsert: vi.fn() },
	offkaiAnswerHistory: { create: vi.fn() },
	commitmentAnswer: { deleteMany: vi.fn(), createMany: vi.fn() },
	user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
}));
vi.mock("./prisma", () => ({
	prisma: { $transaction: (work: (client: typeof tx) => unknown) => work(tx) },
}));
import { OffkaiAnswerRepository } from "./offkai-answer-repository";

const userId = UserIdSchema.parse("00000000-0000-4000-8000-000000000001");
const eventId = OffkaiEventIdSchema.parse(
	"00000000-0000-4000-8000-000000000002",
);
const answer = OffkaiAnswer.reconstruct({
	id: AnswerIdSchema.parse("00000000-0000-4000-8000-000000000003"),
	eventId,
	userId,
	commitmentAnswers: [],
	preferenceAnswers: [],
});

beforeEach(() => {
	vi.resetAllMocks();
	tx.offkaiAnswer.findFirst.mockResolvedValue(null);
	tx.user.findUniqueOrThrow.mockResolvedValue({ name: "プロフィール名" });
});

describe("イベント内の参加者名", () => {
	it("名前を省略した初回回答ではプロフィール名を保存する", async () => {
		await new OffkaiAnswerRepository().save(answer, userId);
		expect(tx.offkaiAnswer.upsert.mock.calls[0][0].create.respondentName).toBe(
			"プロフィール名",
		);
	});

	it.each([
		false,
		true,
	])("指定名をイベントの回答だけに保存する（既存回答: %s）", async (existing) => {
		if (existing)
			tx.offkaiAnswer.findFirst.mockResolvedValue({
				...answer,
				respondentName: "以前の名前",
			});
		await new OffkaiAnswerRepository().save(
			OffkaiAnswer.reconstruct({
				...answer,
				respondentName: "イベント用の名前",
			}),
			userId,
		);
		const saved = tx.offkaiAnswer.upsert.mock.calls[0][0];
		expect(saved.where).toEqual({ id: answer.id });
		expect(saved.create.eventId).toBe(eventId);
		expect(saved.create.respondentName).toBe("イベント用の名前");
		expect(saved.update.respondentName).toBe("イベント用の名前");
		expect(tx.user.update).not.toHaveBeenCalled();
		expect(tx.user.findUniqueOrThrow).not.toHaveBeenCalled();
	});

	it("名前が省略された更新では保存済みのイベント名を維持する", async () => {
		tx.offkaiAnswer.findFirst.mockResolvedValue({
			...answer,
			respondentName: "保存済みの名前",
		});
		await new OffkaiAnswerRepository().save(answer, userId);
		expect(tx.offkaiAnswer.upsert.mock.calls[0][0].update.respondentName).toBe(
			"保存済みの名前",
		);
	});

	it("前後の空白を除去し、空白のみや50文字超の名前を拒否する", () => {
		const payload = { eventId, commitmentAnswers: [], preferenceAnswers: [] };
		expect(
			SaveOffkaiAnswerRequestSchema.parse({
				...payload,
				respondentName: "  名前  ",
			}).respondentName,
		).toBe("名前");
		for (const respondentName of ["", "  ", "あ".repeat(51)]) {
			expect(
				SaveOffkaiAnswerRequestSchema.safeParse({ ...payload, respondentName })
					.success,
			).toBe(false);
		}
		expect(
			SaveOffkaiAnswerRequestSchema.safeParse({
				...payload,
				respondentName: "あ".repeat(50),
			}).success,
		).toBe(true);
	});
});
