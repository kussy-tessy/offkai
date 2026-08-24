import {
	SettlementExpense,
	SettlementIncome,
	type CreateSettlementIncomeRequest,
	type DeleteSettlementIncomeRequest,
	type CreateSettlementExpenseRequest,
	type DeleteSettlementExpenseRequest,
	type GetEventSettlementRequest,
	type GetEventSettlementResponse,
	type Unbrand,
	type UpdateSettlementExpenseRequest,
	type UpdateSettlementIncomeRequest,
	type UserId,
} from "@offkai/core";
import { AppError, runBusinessRule } from "../../../app-error";
import { hasSeriesRole } from "../../../authorization/event-access";
import {
	EventFinanceRepository,
	OffkaiEventRepository,
	ParticipantFinanceRepository,
	SettlementExpenseRepository,
	SettlementIncomeRepository,
} from "../../../repository";
import { SettlementPageAssembler } from "../../../service/settlement.service";
import { FinanceUsecase } from "./finance.usecase";

export class SettlementUsecase {
	constructor(
		private readonly eventRepository = new OffkaiEventRepository(),
		private readonly financeRepository = new EventFinanceRepository(),
		private readonly expenseRepository = new SettlementExpenseRepository(),
		private readonly incomeRepository = new SettlementIncomeRepository(),
		private readonly participantRepository = new ParticipantFinanceRepository(),
		private readonly pageAssembler = new SettlementPageAssembler(),
		private readonly financeUsecase = new FinanceUsecase(),
	) {}

	async getPage(
		input: GetEventSettlementRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventSettlementResponse>> {
		await this.authorize(input.eventId, viewerUserId);
		await this.financeUsecase.getPage(input, viewerUserId);
		return this.pageAssembler.build(input.eventId);
	}

	async createExpense(
		input: CreateSettlementExpenseRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventSettlementResponse>> {
		await this.authorize(input.eventId, viewerUserId);
		await this.requireRefundUnlocked(input.eventId);
		await this.requireCategory(input.eventId, input.categoryId);
		const expense = runBusinessRule(() => SettlementExpense.create(input));
		try {
			await this.expenseRepository.save(input.eventId, expense);
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes("参加者が見つかりません")
			) {
				throw new AppError("RESPONDENT_NOT_FOUND", error.message);
			}
			throw error;
		}
		await this.participantRepository.clearRefundCalculationsByEventId(
			input.eventId,
		);
		return this.pageAssembler.build(input.eventId);
	}

	async updateExpense(
		input: UpdateSettlementExpenseRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventSettlementResponse>> {
		await this.authorize(input.eventId, viewerUserId);
		await this.requireRefundUnlocked(input.eventId);
		const existing = await this.expenseRepository.findByEventAndId(
			input.eventId,
			input.expenseId,
		);
		if (!existing)
			throw new AppError("VALIDATION_ERROR", "経費が見つかりません。");
		if (existing.categoryId !== input.categoryId) {
			throw new AppError(
				"VALIDATION_ERROR",
				"経費の精算区分は変更できません。",
			);
		}
		const updated = runBusinessRule(() => existing.edit(input));
		await this.expenseRepository.save(input.eventId, updated);
		await this.participantRepository.clearRefundCalculationsByEventId(
			input.eventId,
		);
		return this.pageAssembler.build(input.eventId);
	}

	async deleteExpense(
		input: DeleteSettlementExpenseRequest,
		viewerUserId: UserId,
	): Promise<void> {
		await this.authorize(input.eventId, viewerUserId);
		await this.requireRefundUnlocked(input.eventId);
		if (
			!(await this.expenseRepository.delete(input.eventId, input.expenseId))
		) {
			throw new AppError("VALIDATION_ERROR", "経費が見つかりません。");
		}
		await this.participantRepository.clearRefundCalculationsByEventId(
			input.eventId,
		);
	}

	async createIncome(
		input: CreateSettlementIncomeRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventSettlementResponse>> {
		await this.authorize(input.eventId, viewerUserId);
		await this.requireRefundUnlocked(input.eventId);
		await this.requireCategory(input.eventId, input.categoryId);
		const income = runBusinessRule(() => SettlementIncome.create(input));
		await this.incomeRepository.save(income);
		await this.participantRepository.clearRefundCalculationsByEventId(
			input.eventId,
		);
		return this.pageAssembler.build(input.eventId);
	}

	async updateIncome(
		input: UpdateSettlementIncomeRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventSettlementResponse>> {
		await this.authorize(input.eventId, viewerUserId);
		await this.requireRefundUnlocked(input.eventId);
		const existing = await this.incomeRepository.findByEventAndId(
			input.eventId,
			input.incomeId,
		);
		if (!existing)
			throw new AppError("VALIDATION_ERROR", "収入が見つかりません。");
		if (existing.categoryId !== input.categoryId) {
			throw new AppError(
				"VALIDATION_ERROR",
				"収入の精算区分は変更できません。",
			);
		}
		await this.incomeRepository.save(
			runBusinessRule(() => existing.edit(input)),
		);
		await this.participantRepository.clearRefundCalculationsByEventId(
			input.eventId,
		);
		return this.pageAssembler.build(input.eventId);
	}

	async deleteIncome(
		input: DeleteSettlementIncomeRequest,
		viewerUserId: UserId,
	): Promise<void> {
		await this.authorize(input.eventId, viewerUserId);
		await this.requireRefundUnlocked(input.eventId);
		if (!(await this.incomeRepository.delete(input.eventId, input.incomeId))) {
			throw new AppError("VALIDATION_ERROR", "収入が見つかりません。");
		}
		await this.participantRepository.clearRefundCalculationsByEventId(
			input.eventId,
		);
	}

	private async requireRefundUnlocked(
		eventId: GetEventSettlementRequest["eventId"],
	) {
		const finance = await this.financeRepository.findByEventId(eventId);
		if (finance.refundLockedAt) {
			throw new AppError(
				"VALIDATION_ERROR",
				"返金開始後は収入・経費・協力金を変更できません。",
			);
		}
		return finance;
	}

	private async requireCategory(
		eventId: GetEventSettlementRequest["eventId"],
		categoryId: CreateSettlementExpenseRequest["categoryId"],
	) {
		const finance = await this.financeRepository.findByEventId(eventId);
		const category = finance.categories.find((item) => item.id === categoryId);
		if (!category)
			throw new AppError("VALIDATION_ERROR", "精算区分が見つかりません。");
		return category;
	}

	private async authorize(
		eventId: GetEventSettlementRequest["eventId"],
		userId: UserId,
	) {
		const event = await this.eventRepository.findById(eventId);
		const role = await this.eventRepository.findSeriesMemberRole(
			userId,
			event.seriesId,
		);
		if (!hasSeriesRole(role, "staff")) {
			throw new AppError(
				"FORBIDDEN",
				"このオフ会の経費を管理する権限がありません。",
			);
		}
	}
}
