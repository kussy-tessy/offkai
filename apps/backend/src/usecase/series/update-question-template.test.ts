import { UpdateSeriesQuestionTemplateRequestSchema } from "@offkai/core";
import { describe, expect, it } from "vitest";

const base = {
	preferenceQuestions: [],
	askBringingKigurumi: false,
	overviewVisibility: "AUTHENTICATED" as const,
	participantsVisibility: "AUTHENTICATED" as const,
	participationEligibility: "AUTHENTICATED" as const,
};

describe("オフ会テンプレート", () => {
	it("参加表明できる人を公開範囲とは別の型として受け付ける", () => {
		expect(
			UpdateSeriesQuestionTemplateRequestSchema.parse({
				...base,
				participationEligibility: "GUILD_MEMBERS",
			}),
		).toMatchObject({ participationEligibility: "GUILD_MEMBERS" });
	});

	it("参加者一覧を概要より広く公開する設定を拒否する", () => {
		expect(() =>
			UpdateSeriesQuestionTemplateRequestSchema.parse({
				...base,
				overviewVisibility: "GUILD_MEMBERS",
				participantsVisibility: "AUTHENTICATED",
			}),
		).toThrow();
	});
});
