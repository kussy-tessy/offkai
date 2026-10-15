import type { FinanceLedger, OffkaiEventId } from "@offkai/core";
import { Prisma } from "@prisma/client";
import { AppError } from "../../app-error";
import { prisma } from "../prisma";
import { readLedger, writeLedger } from "./state";
import { readFinanceSources } from "./sources";
import { readLegacyFinance } from "./legacy";
import { readHistory, saveHistory, type LedgerHistoryInput } from "./history";

/** Every operation uses the same client supplied by the transaction boundary. */
export class FinanceLedgerRepository {
	constructor(private readonly client: Prisma.TransactionClient = prisma) {}

	read(eventId: string) {
		return readLedger(this.client, eventId);
	}

	write(eventId: string, state: FinanceLedger) {
		return writeLedger(this.client, eventId, state);
	}

	sources(eventId: string) {
		return readFinanceSources(this.client, eventId);
	}

	legacy(eventId: OffkaiEventId) {
		return readLegacyFinance(this.client, eventId);
	}

	history(eventId: string) {
		return readHistory(this.client, eventId);
	}

	saveHistory(input: LedgerHistoryInput) {
		return saveHistory(this.client, input);
	}

	async lock(eventId: string) {
		await this.client
			.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`finance-ledger:${eventId}`}, 0))`;
	}

	async exists(eventId: string) {
		return Boolean(
			await this.client.financeLedger.findUnique({ where: { eventId } }),
		);
	}

	async create(eventId: string) {
		await this.client.financeLedger.create({ data: { eventId } });
	}

	async setRevision(eventId: string, revision: number) {
		await this.client.financeLedger.update({
			where: { eventId },
			data: { revision },
		});
	}

	async advanceRevision(eventId: string, expectedRevision: number) {
		const updated = await this.client.financeLedger.updateMany({
			where: { eventId, revision: expectedRevision },
			data: { revision: { increment: 1 } },
		});
		return updated.count === 1;
	}

	findRequest(eventId: string, requestId: string) {
		return this.client.financeLedgerHistory.findUnique({
			where: { eventId_requestId: { eventId, requestId } },
		});
	}

	async hasLegacyData(eventId: string) {
		const rows = await Promise.all([
			this.client.eventFinance.findUnique({
				where: { eventId },
				select: { eventId: true },
			}),
			this.client.participantFinance.findFirst({
				where: { answer: { eventId } },
				select: { answerId: true },
			}),
			this.client.participantPayment.findFirst({
				where: { answer: { eventId } },
				select: { answerId: true },
			}),
		]);
		return rows.some(Boolean);
	}
}

export function withLedgerTransaction<T>(
	run: (repository: FinanceLedgerRepository) => Promise<T>,
) {
	return prisma.$transaction((tx) => run(new FinanceLedgerRepository(tx)), {
		timeout: 30000,
	});
}

export function rethrowLedgerPersistenceError(error: unknown): never {
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2002")
			throw new AppError(
				"CONFLICT",
				"同じ質問の精算区分、または同じ操作がすでに登録されています。再読み込みしてください。",
			);
		if (error.code === "P2003")
			throw new AppError(
				"VALIDATION_ERROR",
				"関連する記録があるため変更できません。区分・請求・入出金の参照先を確認してください。",
			);
	}

	throw error;
}
