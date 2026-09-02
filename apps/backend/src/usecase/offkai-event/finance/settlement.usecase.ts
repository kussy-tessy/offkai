import {
	FinalRefundCalculator,
	SettlementExpense,
	SettlementIncome,
	SettlementCalculator,
	type CreateSettlementIncomeRequest,
	type DeleteSettlementIncomeRequest,
	type CreateSettlementExpenseRequest,
	type DeleteSettlementExpenseRequest,
	type GetEventSettlementRequest,
	type GetEventSettlementResponse,
	type Unbrand,
	type UpdateSettlementExpenseRequest,
	type UpdateSettlementIncomeRequest,
	type UpdateSettlementLockRequest,
	type UpdateParticipantSettlementNoteRequest,
	type UserId,
} from "@offkai/core";
import { AppError, runBusinessRule } from "../../../app-error";
import { requireEventPermission } from "../../../authorization/staff-permissions";
import {
	EventFinanceRepository,
	OffkaiEventRepository,
	ParticipantFinanceRepository,
	SettlementExpenseRepository,
	SettlementIncomeRepository,
	prisma,
} from "../../../repository";
import { SettlementPageAssembler } from "../../../service/settlement.service";
import { FinanceUsecase } from "./finance.usecase";

export class SettlementUsecase {
	constructor(
		readonly _eventRepository = new OffkaiEventRepository(),
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
		await requireEventPermission(input.eventId, viewerUserId, { area: "settlement", level: "read" });
		await this.financeUsecase.ensureInitialized(input.eventId);
		return this.pageAssembler.build(input.eventId);
	}

	async updateParticipantNote(
		input: UpdateParticipantSettlementNoteRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventSettlementResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, {
			area: "settlement",
			level: "edit",
		});
		const finance = await this.financeRepository.findByEventId(input.eventId);
		if (finance.settlementLockedAt) {
			throw new AppError("VALIDATION_ERROR", "確定済みの経費精算は変更できません。");
		}
		const participant = await this.participantRepository.findByEventAndUser(
			input.eventId,
			input.userId,
		);
		if (!participant)
			throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
		await this.participantRepository.save(
			input.eventId,
			participant.changeSettlementNote(input.note),
		);
		return this.pageAssembler.build(input.eventId);
	}

	async lock(
		input: UpdateSettlementLockRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventSettlementResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "settlement", level: "confirm" });
		const [finance, expenses, incomes, participants] = await Promise.all([
			this.financeRepository.findByEventId(input.eventId),
			this.expenseRepository.findManyByEventId(input.eventId),
			this.incomeRepository.findManyByEventId(input.eventId),
			this.participantRepository.findManyByEventId(input.eventId),
		]);
		if (finance.settlementLockedAt) {
			throw new AppError(
				"VALIDATION_ERROR",
				"経費精算はすでに確定されています。",
			);
		}
		const calculation = FinalRefundCalculator.calculate(
			finance.categories.map((category) => ({
				categoryId: category.id,
				categoryName: category.name,
				calculation: SettlementCalculator.calculate(
					category,
					expenses.filter((expense) => expense.categoryId === category.id),
					incomes.filter((income) => income.categoryId === category.id),
				),
			})),
			finance.refundRoundingUnit,
		);
		const amountByUserId = new Map(
			calculation.participants.map((participant) => [
				participant.userId,
				participant.refundAmount,
			]),
		);
		const negativeParticipants = participants.filter(
			(participant) => (amountByUserId.get(participant.userId) ?? 0) < 0,
		);
		if (negativeParticipants.length > 0) {
			throw new AppError(
				"VALIDATION_ERROR",
				"最終精算がマイナスの参加者がいるため、経費精算を確定できません。",
			);
		}
		const lockedAt = new Date();
		const locked = runBusinessRule(() => finance.lockSettlement(lockedAt));
		await prisma.$transaction(async (tx) => {
			const participantRepository = new ParticipantFinanceRepository(tx);
			for (const participant of participants) {
				await participantRepository.save(
					input.eventId,
					runBusinessRule(() =>
						participant.setRefundCalculation(
							amountByUserId.get(participant.userId) ?? 0,
							lockedAt,
						),
					),
				);
			}
			await new EventFinanceRepository(tx).save(locked);
		});
		return this.pageAssembler.build(input.eventId);
	}

	async unlock(
		input: UpdateSettlementLockRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventSettlementResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "settlement", level: "confirm" });
		const finance = await this.financeRepository.findByEventId(input.eventId);
		const unlocked = runBusinessRule(() => finance.unlockSettlement());
		await prisma.$transaction(async (tx) => {
			await new EventFinanceRepository(tx).save(unlocked);
			await new ParticipantFinanceRepository(
				tx,
			).clearRefundCalculationsByEventId(input.eventId);
		});
		return this.pageAssembler.build(input.eventId);
	}

	async createExpense(
		input: CreateSettlementExpenseRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventSettlementResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "settlement", level: "edit" });
		await this.requireSettlementUnlocked(input.eventId);
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
		await requireEventPermission(input.eventId, viewerUserId, { area: "settlement", level: "edit" });
		await this.requireSettlementUnlocked(input.eventId);
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
		await requireEventPermission(input.eventId, viewerUserId, { area: "settlement", level: "edit" });
		await this.requireSettlementUnlocked(input.eventId);
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
		await requireEventPermission(input.eventId, viewerUserId, { area: "settlement", level: "edit" });
		await this.requireSettlementUnlocked(input.eventId);
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
		await requireEventPermission(input.eventId, viewerUserId, { area: "settlement", level: "edit" });
		await this.requireSettlementUnlocked(input.eventId);
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
		await requireEventPermission(input.eventId, viewerUserId, { area: "settlement", level: "edit" });
		await this.requireSettlementUnlocked(input.eventId);
		if (!(await this.incomeRepository.delete(input.eventId, input.incomeId))) {
			throw new AppError("VALIDATION_ERROR", "収入が見つかりません。");
		}
		await this.participantRepository.clearRefundCalculationsByEventId(
			input.eventId,
		);
	}

	private async requireSettlementUnlocked(
		eventId: GetEventSettlementRequest["eventId"],
	) {
		const finance = await this.financeRepository.findByEventId(eventId);
		if (finance.settlementLockedAt) {
			throw new AppError(
				"VALIDATION_ERROR",
				"経費精算の確定後は収入・経費・協力金を変更できません。",
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

}
