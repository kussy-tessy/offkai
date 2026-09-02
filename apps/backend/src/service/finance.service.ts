import {
	type EventFinance,
	type GetEventFeeCollectionResponse,
	GetEventFeeCollectionResponseSchema,
	type GetEventFinanceResponse,
	GetEventFinanceResponseSchema,
	type OffkaiEventId,
	ParticipantFinance,
	type ParticipantFinance as ParticipantFinanceEntity,
	type Unbrand,
	type UserId,
} from "@offkai/core";
import {
	EventFinanceRepository,
	OffkaiEventRepository,
	ParticipantFinanceRepository,
	prisma,
} from "../repository";

export class FinancePageAssembler {
	constructor(
		private readonly eventRepository = new OffkaiEventRepository(),
		private readonly financeRepository = new EventFinanceRepository(),
		private readonly participantFinanceRepository = new ParticipantFinanceRepository(),
	) {}

	async build(
		eventId: OffkaiEventId,
	): Promise<Unbrand<GetEventFinanceResponse>> {
		const [questions, finance, respondents, participantFinances] =
			await Promise.all([
				this.eventRepository.findCommitmentQuestionsForFinance(eventId),
				this.financeRepository.findByEventId(eventId),
				this.eventRepository.findParticipantsByEventId(eventId),
				this.participantFinanceRepository.findManyByEventId(eventId),
			]);
		const financesByUserId = new Map(
			participantFinances.map((participant) => [
				participant.userId,
				participant,
			]),
		);
		const actorIds = participantFinances.flatMap((participant) =>
			[participant.collectedByUserId, participant.refundedByUserId].filter(
				(value): value is UserId => value !== null,
			),
		);
		const actors = await prisma.user.findMany({
			where: { id: { in: actorIds } },
			select: { id: true, name: true },
		});
		const actorNameById = new Map(actors.map((actor) => [actor.id, actor.name]));

		return GetEventFinanceResponseSchema.parse({
			refundRoundingUnit: finance.refundRoundingUnit,
			feeCalculationLockedAt:
				finance.feeCalculationLockedAt?.toISOString() ?? null,
			collectionStartedAt: finance.collectionStartedAt?.toISOString() ?? null,
			settlementLockedAt: finance.settlementLockedAt?.toISOString() ?? null,
			refundStartedAt: finance.refundStartedAt?.toISOString() ?? null,
			questions,
			categories: finance.categories.map((category) => ({
				id: category.id,
				name: category.name,
				baseParticipationFeeAmount: category.baseParticipationFeeAmount,
				commitmentQuestionId: category.commitmentQuestionId,
				members: category.members.map((member) => ({
					...member,
					effectiveAmount: category.amountFor(member.userId),
				})),
			})),
			participants: respondents.map((respondent) => {
				const participant = financesByUserId.get(respondent.userId);
				return {
					userId: respondent.userId,
					displayName: respondent.displayName,
					note: participant?.note ?? null,
					collectionNote: participant?.collectionNote ?? null,
					settlementNote: participant?.settlementNote ?? null,
					refundNote: participant?.refundNote ?? null,
					chargeAmount: participant?.chargeAmount ?? 0,
					collectedAt: participant?.collectedAt?.toISOString() ?? null,
					collectedByName: participant?.collectedByUserId
						? actorNameById.get(participant.collectedByUserId) ?? null
						: null,
					refundAmount: participant?.refundAmount ?? null,
					refundCalculatedAt:
						participant?.refundCalculatedAt?.toISOString() ?? null,
					refundedAt: participant?.refundedAt?.toISOString() ?? null,
					refundedByName: participant?.refundedByUserId
						? actorNameById.get(participant.refundedByUserId) ?? null
						: null,
					extraCharges: participant?.extraCharges ?? [],
				};
			}),
		});
	}
}

export class FeeCollectionPageAssembler {
	constructor(
		private readonly financePageAssembler = new FinancePageAssembler(),
	) {}

	async build(
		eventId: OffkaiEventId,
	): Promise<Unbrand<GetEventFeeCollectionResponse>> {
		const finance = await this.financePageAssembler.build(eventId);
		return GetEventFeeCollectionResponseSchema.parse({
			feeCalculationLockedAt: finance.feeCalculationLockedAt,
			categories: finance.categories.map((category) => ({
				name: category.name,
				members: category.members.map((member) => ({
					userId: member.userId,
					effectiveAmount: member.effectiveAmount,
				})),
			})),
			participants: finance.participants.map((participant) => ({
				userId: participant.userId,
				displayName: participant.displayName,
				note: participant.note,
				collectionNote: participant.collectionNote,
				chargeAmount: participant.chargeAmount,
				collectedAt: participant.collectedAt,
				collectedByName: participant.collectedByName,
				extraCharges: participant.extraCharges.map((charge) => ({
					title: charge.title,
					amount: charge.amount,
				})),
			})),
		});
	}
}

export class ParticipantChargeCalculationService {
	constructor(
		private readonly financeRepository: EventFinanceRepository,
		private readonly participantFinanceRepository: ParticipantFinanceRepository,
	) {}

	async recalculate(
		eventId: OffkaiEventId,
		finance?: EventFinance,
	): Promise<void> {
		const currentFinance =
			finance ?? (await this.financeRepository.findByEventId(eventId));
		const participants =
			await this.participantFinanceRepository.findManyByEventId(eventId);

		for (const participant of participants) {
			const categoryAmounts = currentFinance.categories.flatMap((category) => {
				const amount = category.amountFor(participant.userId);
				return amount === null ? [] : [amount];
			});
			const calculated = ParticipantFinance.calculate({
				userId: participant.userId,
				note: participant.note,
				collectionNote: participant.collectionNote,
				settlementNote: participant.settlementNote,
				refundNote: participant.refundNote,
				categoryAmounts,
				extraCharges: participant.extraCharges,
				collectedAt: participant.collectedAt,
				collectedByUserId: participant.collectedByUserId,
				refundAmount: participant.refundAmount,
				refundCalculatedAt: participant.refundCalculatedAt,
				refundedAt: participant.refundedAt,
				refundedByUserId: participant.refundedByUserId,
			});
			await this.participantFinanceRepository.save(eventId, calculated);
		}
	}
}

export class FinancePersistenceService {
	async saveEventFinance(finance: EventFinance): Promise<void> {
		await prisma.$transaction(async (tx) => {
			const financeRepository = new EventFinanceRepository(tx);
			const participantRepository = new ParticipantFinanceRepository(tx);
			await financeRepository.save(finance);
			await new ParticipantChargeCalculationService(
				financeRepository,
				participantRepository,
			).recalculate(finance.eventId, finance);
		});
	}

	async saveParticipantFinance(
		eventId: OffkaiEventId,
		participant: ParticipantFinanceEntity,
		recalculate: boolean,
	): Promise<void> {
		await prisma.$transaction(async (tx) => {
			const financeRepository = new EventFinanceRepository(tx);
			const participantRepository = new ParticipantFinanceRepository(tx);
			await participantRepository.save(eventId, participant);
			if (recalculate) {
				await new ParticipantChargeCalculationService(
					financeRepository,
					participantRepository,
				).recalculate(eventId);
			}
		});
	}

	async saveCollection(
		eventId: OffkaiEventId,
		participant: ParticipantFinanceEntity,
		financeWithCollectionStarted?: EventFinance,
	): Promise<void> {
		await prisma.$transaction(async (tx) => {
			if (financeWithCollectionStarted) {
				await new EventFinanceRepository(tx).save(financeWithCollectionStarted);
			}
			await new ParticipantFinanceRepository(tx).save(eventId, participant);
		});
	}
}
