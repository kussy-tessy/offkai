import {
	SettlementCategory,
	type CreateParticipantExtraChargeRequest,
	type CreateSettlementCategoryRequest,
	type DeleteParticipantExtraChargeRequest,
	type DeleteSettlementCategoryMemberRequest,
	type DeleteSettlementCategoryRequest,
	type GetEventFinanceRequest,
	type GetEventFinanceResponse,
	type SyncSettlementCategoryMembersRequest,
	type SyncSettlementCategoryMembersResponse,
	type Unbrand,
	type UpdateFinanceSettingsRequest,
	type UpdateFeeCalculationLockRequest,
	type UpdateParticipantExtraChargeRequest,
	type UpdateParticipantFinanceNoteRequest,
	type UpdateParticipantCollectionRequest,
	type UpdateSettlementCategoryMemberRequest,
	type UpdateSettlementCategoryRequest,
	type UserId,
} from "@offkai/core";
import { AppError, runBusinessRule } from "../../../app-error";
import { requireAnyEventPermission, requireEventPermission } from "../../../authorization/staff-permissions";
import {
	EventFinanceRepository,
	OffkaiAnswerRepository,
	OffkaiEventRepository,
	ParticipantFinanceRepository,
	SettlementExpenseRepository,
	SettlementIncomeRepository,
} from "../../../repository";
import {
	FinancePageAssembler,
	FinancePersistenceService,
} from "../../../service/finance.service";

export class FinanceUsecase {
	constructor(
		private readonly financeRepository = new EventFinanceRepository(),
		private readonly participantRepository = new ParticipantFinanceRepository(),
		private readonly settlementExpenseRepository = new SettlementExpenseRepository(),
		private readonly settlementIncomeRepository = new SettlementIncomeRepository(),
		private readonly eventRepository = new OffkaiEventRepository(),
		private readonly answerRepository = new OffkaiAnswerRepository(),
		private readonly pageAssembler = new FinancePageAssembler(),
		private readonly persistenceService = new FinancePersistenceService(),
	) {}

	async getPage(
		input: GetEventFinanceRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireAnyEventPermission(input.eventId, viewerUserId, [
			{ area: "feeCalculation", level: "read" },
			{ area: "feeCollection", level: "read" },
			{ area: "settlement", level: "read" },
			{ area: "refund", level: "read" },
		]);
		await this.initializeFinance(input.eventId);
		return this.pageAssembler.build(input.eventId);
	}

	private async initializeFinance(
		eventId: GetEventFinanceRequest["eventId"],
	): Promise<void> {
		if (await this.financeRepository.existsByEventId(eventId)) return;
		const questions =
			await this.eventRepository.findCommitmentQuestionsForFinance(eventId);
		let finance = await this.financeRepository.findByEventId(eventId);
		for (const question of questions.filter((item) => !item.archived)) {
			const usedNames = new Set(
				finance.categories.map((category) => category.name),
			);
			let name = question.questionShort;
			let suffix = 2;
			while (usedNames.has(name))
				name = `${question.questionShort} (${suffix++})`;
			const userIds = await this.answerRepository.findUserIdsAnsweredYes(
				eventId,
				question.id,
			);
			const category = runBusinessRule(
				() =>
					SettlementCategory.create({
						eventId,
						name,
						baseParticipationFeeAmount: 0,
						commitmentQuestionId: question.id,
					}).syncMembers(userIds).category,
			);
			finance = runBusinessRule(() => finance.addCategory(category));
		}
		await this.persistenceService.saveEventFinance(finance);
	}

	async updateSettings(
		input: UpdateFinanceSettingsRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "settlement", level: "confirm" });
		const finance = await this.financeRepository.findByEventId(input.eventId);
		if (finance.settlementLockedAt) {
			throw new AppError(
				"VALIDATION_ERROR",
				"経費精算の確定後は切り捨て単位を変更できません。",
			);
		}
		const updated = runBusinessRule(() =>
			finance.changeRoundingUnit(input.refundRoundingUnit),
		);
		await this.persistenceService.saveEventFinance(updated);
		await this.participantRepository.clearRefundCalculationsByEventId(
			input.eventId,
		);
		return this.pageAssembler.build(input.eventId);
	}

	async lockFeeCalculation(
		input: UpdateFeeCalculationLockRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "confirm" });
		const finance = await this.requireFeeCalculationUnlocked(input.eventId);
		const updated = runBusinessRule(() =>
			finance.lockFeeCalculation(new Date()),
		);
		await this.persistenceService.saveEventFinance(updated);
		return this.pageAssembler.build(input.eventId);
	}

	async unlockFeeCalculation(
		input: UpdateFeeCalculationLockRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "confirm" });
		const finance = await this.requireFeeCalculationLocked(input.eventId);
		if (finance.collectionStartedAt) {
			throw new AppError(
				"VALIDATION_ERROR",
				"徴収を開始した参加費は確定解除できません。システム外で対応してください。",
			);
		}
		const updated = runBusinessRule(() => finance.unlockFeeCalculation());
		await this.persistenceService.saveEventFinance(updated);
		await this.participantRepository.clearRefundCalculationsByEventId(
			input.eventId,
		);
		return this.pageAssembler.build(input.eventId);
	}

	async createCategory(
		input: CreateSettlementCategoryRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "edit" });
		await this.validateQuestion(input.eventId, input.commitmentQuestionId);
		const finance = await this.requireFeeCalculationUnlocked(input.eventId);
		const category = runBusinessRule(() =>
			SettlementCategory.create({
				eventId: input.eventId,
				name: input.name,
				baseParticipationFeeAmount: input.baseParticipationFeeAmount,
				commitmentQuestionId: input.commitmentQuestionId,
			}),
		);
		const updated = runBusinessRule(() => finance.addCategory(category));
		await this.persistenceService.saveEventFinance(updated);
		return this.pageAssembler.build(input.eventId);
	}

	async updateCategory(
		input: UpdateSettlementCategoryRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "edit" });
		await this.validateQuestion(input.eventId, input.commitmentQuestionId);
		const finance = await this.requireFeeCalculationUnlocked(input.eventId);
		const category = this.requireCategory(finance.categories, input.categoryId);
		const updated = runBusinessRule(() =>
			category.edit({
				name: input.name,
				baseParticipationFeeAmount: input.baseParticipationFeeAmount,
				commitmentQuestionId: input.commitmentQuestionId,
			}),
		);
		const updatedFinance = runBusinessRule(() =>
			finance.replaceCategory(updated),
		);
		await this.persistenceService.saveEventFinance(updatedFinance);
		return this.pageAssembler.build(input.eventId);
	}

	async deleteCategory(
		input: DeleteSettlementCategoryRequest,
		viewerUserId: UserId,
	): Promise<void> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "edit" });
		const finance = await this.requireFeeCalculationUnlocked(input.eventId);
		if (
			await this.settlementExpenseRepository.hasByCategoryId(input.categoryId)
		) {
			throw new AppError(
				"VALIDATION_ERROR",
				"経費が登録されている精算区分は削除できません。",
			);
		}
		if (
			await this.settlementIncomeRepository.hasByCategoryId(input.categoryId)
		) {
			throw new AppError(
				"VALIDATION_ERROR",
				"収入が登録されている精算区分は削除できません。",
			);
		}
		const updated = runBusinessRule(() =>
			finance.removeCategory(input.categoryId),
		);
		await this.persistenceService.saveEventFinance(updated);
	}

	async syncMembers(
		input: SyncSettlementCategoryMembersRequest,
		viewerUserId: UserId,
	): Promise<SyncSettlementCategoryMembersResponse> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "edit" });
		const finance = await this.requireFeeCalculationUnlocked(input.eventId);
		const category = this.requireCategory(finance.categories, input.categoryId);
		if (!category.commitmentQuestionId) {
			throw new AppError(
				"VALIDATION_ERROR",
				"参加回答と関連付けられていない精算区分です。",
			);
		}
		await this.validateQuestion(
			input.eventId,
			category.commitmentQuestionId,
			true,
		);
		const userIds = await this.answerRepository.findUserIdsAnsweredYes(
			input.eventId,
			category.commitmentQuestionId,
		);
		const result = runBusinessRule(() => category.syncMembers(userIds));
		const updatedFinance = runBusinessRule(() =>
			finance.replaceCategory(result.category),
		);
		await this.persistenceService.saveEventFinance(updatedFinance);
		return {
			addedCount: result.addedCount,
			removedCount: result.removedCount,
			resetOverrideCount: result.resetOverrideCount,
		};
	}

	async updateMember(
		input: UpdateSettlementCategoryMemberRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "edit" });
		if (
			!(await this.participantRepository.findByEventAndUser(
				input.eventId,
				input.userId,
			))
		) {
			throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
		}
		const finance = await this.requireFeeCalculationUnlocked(input.eventId);
		const category = this.requireCategory(finance.categories, input.categoryId);
		const updated = runBusinessRule(() =>
			category.setMember(input.userId, input.amountOverride),
		);
		const updatedFinance = runBusinessRule(() =>
			finance.replaceCategory(updated),
		);
		await this.persistenceService.saveEventFinance(updatedFinance);
		return this.pageAssembler.build(input.eventId);
	}

	async deleteMember(
		input: DeleteSettlementCategoryMemberRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "edit" });
		const finance = await this.requireFeeCalculationUnlocked(input.eventId);
		const category = this.requireCategory(finance.categories, input.categoryId);
		const updatedCategory = runBusinessRule(() =>
			category.removeMember(input.userId),
		);
		const updatedFinance = runBusinessRule(() =>
			finance.replaceCategory(updatedCategory),
		);
		await this.persistenceService.saveEventFinance(updatedFinance);
		return this.pageAssembler.build(input.eventId);
	}

	async createExtraCharge(
		input: CreateParticipantExtraChargeRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "edit" });
		await this.requireFeeCalculationUnlocked(input.eventId);
		const participant = await this.participantRepository.findByEventAndUser(
			input.eventId,
			input.userId,
		);
		if (!participant) {
			throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
		}
		const updated = runBusinessRule(() => participant.addExtraCharge(input));
		await this.persistenceService.saveParticipantFinance(
			input.eventId,
			updated,
			true,
		);
		return this.pageAssembler.build(input.eventId);
	}

	async updateExtraCharge(
		input: UpdateParticipantExtraChargeRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "edit" });
		await this.requireFeeCalculationUnlocked(input.eventId);
		const participant = await this.participantRepository.findByEventAndUser(
			input.eventId,
			input.userId,
		);
		if (!participant) {
			throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
		}
		const updated = runBusinessRule(() =>
			participant.editExtraCharge(input.extraChargeId, input),
		);
		await this.persistenceService.saveParticipantFinance(
			input.eventId,
			updated,
			true,
		);
		return this.pageAssembler.build(input.eventId);
	}

	async deleteExtraCharge(
		input: DeleteParticipantExtraChargeRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "edit" });
		await this.requireFeeCalculationUnlocked(input.eventId);
		const participant = await this.participantRepository.findByEventAndUser(
			input.eventId,
			input.userId,
		);
		if (!participant) {
			throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
		}
		const updated = runBusinessRule(() =>
			participant.removeExtraCharge(input.extraChargeId),
		);
		await this.persistenceService.saveParticipantFinance(
			input.eventId,
			updated,
			true,
		);
		return this.pageAssembler.build(input.eventId);
	}

	async updateParticipantNote(
		input: UpdateParticipantFinanceNoteRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCalculation", level: "edit" });
		await this.requireFeeCalculationUnlocked(input.eventId);
		const participant = await this.participantRepository.findByEventAndUser(
			input.eventId,
			input.userId,
		);
		if (!participant) {
			throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
		}
		const updated = runBusinessRule(() => participant.changeNote(input.note));
		await this.persistenceService.saveParticipantFinance(
			input.eventId,
			updated,
			false,
		);
		return this.pageAssembler.build(input.eventId);
	}

	async updateParticipantCollection(
		input: UpdateParticipantCollectionRequest,
		viewerUserId: UserId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		await requireEventPermission(input.eventId, viewerUserId, { area: "feeCollection", level: "record" });
		const finance = await this.requireFeeCalculationLocked(input.eventId);
		const participant = await this.participantRepository.findByEventAndUser(
			input.eventId,
			input.userId,
		);
		if (!participant) {
			throw new AppError("RESPONDENT_NOT_FOUND", "回答者が見つかりません。");
		}
		const updated = runBusinessRule(() =>
			input.collected
				? participant.markCollected(new Date())
				: participant.markUncollected(),
		);
		const financeWithCollectionStarted =
			input.collected && !finance.collectionStartedAt
				? runBusinessRule(() => finance.markCollectionStarted(new Date()))
				: undefined;
		await this.persistenceService.saveCollection(
			input.eventId,
			updated,
			financeWithCollectionStarted,
		);
		return this.pageAssembler.build(input.eventId);
	}

	private async requireFeeCalculationUnlocked(
		eventId: GetEventFinanceRequest["eventId"],
	) {
		const finance = await this.financeRepository.findByEventId(eventId);
		if (finance.feeCalculationLockedAt) {
			throw new AppError(
				"VALIDATION_ERROR",
				"確定済みの参加費は変更できません。",
			);
		}
		return finance;
	}

	private async requireFeeCalculationLocked(
		eventId: GetEventFinanceRequest["eventId"],
	) {
		const finance = await this.financeRepository.findByEventId(eventId);
		if (!finance.feeCalculationLockedAt) {
			throw new AppError(
				"VALIDATION_ERROR",
				"参加費を確定してから徴収してください。",
			);
		}
		return finance;
	}

	private async validateQuestion(
		eventId: GetEventFinanceRequest["eventId"],
		questionId: CreateSettlementCategoryRequest["commitmentQuestionId"],
		rejectArchived = false,
	) {
		if (!questionId) return;
		const question = await this.eventRepository.findCommitmentQuestionState(
			eventId,
			questionId,
		);
		if (!question) {
			throw new AppError("VALIDATION_ERROR", "参加可否質問が見つかりません。");
		}
		if (rejectArchived && question.archived) {
			throw new AppError(
				"VALIDATION_ERROR",
				"この精算区分に関連付けられた参加可否質問は削除されています。",
			);
		}
	}

	private requireCategory<T extends { id: string }>(
		categories: T[],
		categoryId: string,
	): T {
		const category = categories.find((item) => item.id === categoryId);
		if (!category)
			throw new AppError("VALIDATION_ERROR", "精算区分が見つかりません。");
		return category;
	}
}
