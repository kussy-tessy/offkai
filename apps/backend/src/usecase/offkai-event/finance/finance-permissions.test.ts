import { OffkaiEventIdSchema, UserIdSchema } from "@offkai/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireEventPermission = vi.hoisted(() => vi.fn());

vi.mock("../../../authorization/staff-permissions", () => ({
	requireEventPermission,
}));

import { FinanceUsecase } from "./finance.usecase";

const eventId = OffkaiEventIdSchema.parse(
	"019c0000-0000-7000-8000-000000000001",
);
const viewerUserId = UserIdSchema.parse(
	"019c0000-0000-7000-8000-000000000002",
);

function createUsecase() {
	const financeRepository = {
		existsByEventId: vi.fn().mockResolvedValue(true),
	};
	const calculationPageAssembler = {
		build: vi.fn().mockResolvedValue({ page: "calculation" }),
	};
	const collectionPageAssembler = {
		build: vi.fn().mockResolvedValue({ page: "collection" }),
	};
	const usecase = new FinanceUsecase(
		financeRepository as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		calculationPageAssembler as never,
		collectionPageAssembler as never,
		{} as never,
	);
	return {
		usecase,
		calculationPageAssembler,
		collectionPageAssembler,
	};
}

describe("財務ページの閲覧権限", () => {
	beforeEach(() => vi.clearAllMocks());

	it("計算ページには参加費計算の閲覧権限を要求する", async () => {
		const { usecase, calculationPageAssembler, collectionPageAssembler } =
			createUsecase();

		await expect(usecase.getPage({ eventId }, viewerUserId)).resolves.toEqual({
			page: "calculation",
		});
		expect(requireEventPermission).toHaveBeenCalledWith(eventId, viewerUserId, {
			area: "feeCalculation",
			level: "read",
		});
		expect(calculationPageAssembler.build).toHaveBeenCalledWith(eventId);
		expect(collectionPageAssembler.build).not.toHaveBeenCalled();
	});

	it("徴収ページには参加費徴収の閲覧権限を要求し専用DTOを返す", async () => {
		const { usecase, calculationPageAssembler, collectionPageAssembler } =
			createUsecase();

		await expect(
			usecase.getCollectionPage({ eventId }, viewerUserId),
		).resolves.toEqual({ page: "collection" });
		expect(requireEventPermission).toHaveBeenCalledWith(eventId, viewerUserId, {
			area: "feeCollection",
			level: "read",
		});
		expect(collectionPageAssembler.build).toHaveBeenCalledWith(eventId);
		expect(calculationPageAssembler.build).not.toHaveBeenCalled();
	});
});
