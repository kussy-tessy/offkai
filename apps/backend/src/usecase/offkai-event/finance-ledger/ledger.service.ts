import {
	applyLedgerCommand,
	calculateFinanceLedger,
	type FinanceLedger,
	FinanceLedgerSchema,
	LedgerCommandSchema,
	ledgerResourceSchemas,
	type OffkaiEventId,
	type UserId,
} from "@offkai/core";
import { AppError, runBusinessRule } from "../../../app-error";
import { getEventAuthorizationContext } from "../../../authorization/staff-permissions";
import {
	FinanceLedgerRepository,
	withLedgerTransaction,
	rethrowLedgerPersistenceError,
} from "../../../repository/finance-ledger/repository";
import { orderFinanceCategories, syncFinanceSources } from "./ledger.sources";
import { buildLegacyLedger } from "./ledger.legacy";
import { projectLedger, fingerprint } from "./ledger.projection";
import {
	allowsLedger,
	type LedgerAccess,
	ledgerCommandRequirements,
} from "./ledger-permissions";

const areas = [
	"feeCalculation",
	"feeCollection",
	"settlement",
	"refund",
] as const;
async function accessFor(
	eventId: OffkaiEventId,
	userId: UserId,
): Promise<LedgerAccess> {
	const context = await getEventAuthorizationContext(eventId, userId);
	const access = {
		owner: context.role === "owner",
		permissions: context.permissions,
	};
	if (
		!access.owner &&
		(context.role !== "staff" ||
			!context.isParticipant ||
			!areas.some((area) => allowsLedger(access, { area, level: "read" })))
	)
		throw new AppError("FORBIDDEN", "財務情報を閲覧する権限がありません。");
	return access;
}
async function createLedger(
	repository: FinanceLedgerRepository,
	eventId: string,
	userId: string,
	state: FinanceLedger,
	action: string,
) {
	await repository.create(eventId);
	await repository.write(eventId, state);
	await repository.saveHistory({
		eventId,
		state,
		revision: 0,
		actorId: userId,
		action,
		resource: action === "activate" ? "migration" : action,
	});
	return { revision: 0, state };
}
function emptyLedger(): FinanceLedger {
	return FinanceLedgerSchema.parse({
		version: 1,
		inputRevision: 0,
		roundingUnit: 10,
		people: [],
		categories: [],
		items: [],
		charges: [],
		expenses: [],
		incomes: [],
		adjustments: [],
		payments: [],
		snapshot: null,
		migrationNotes: [],
	});
}

export async function getLedger(eventId: OffkaiEventId, userId: UserId) {
	const access = await accessFor(eventId, userId);
	return withLedgerTransaction(async (repository) => {
		await repository.lock(eventId);
		let record = await repository.read(eventId);
		const sources = await repository.sources(eventId);
		if (!record) {
			if (!(await repository.hasLegacyData(eventId))) {
				const state = emptyLedger();
				syncFinanceSources(state, sources);
				record = await createLedger(
					repository,
					eventId,
					userId,
					state,
					"initialize",
				);
			}
		} else if (syncFinanceSources(record.state, sources)) {
			record.state.inputRevision++;
			const revision = record.revision + 1;
			await repository.setRevision(eventId, revision);
			await repository.write(eventId, record.state);
			await repository.saveHistory({
				eventId,
				state: record.state,
				revision,
				actorId: userId,
				action: "syncSources",
				resource: "categories",
			});
			record.revision = revision;
		}
		const state =
			record?.state ?? buildLegacyLedger(await repository.legacy(eventId));
		const page = projectLedger(state, record?.revision ?? 0, !!record, access);
		// Current answer names are display-only; keep persisted names as a fallback.
		const names = new Map(sources.people.map((person) => [person.id, person.name]));
		page.state.people = page.state.people.map((person) => ({
			...person,
			name: names.get(person.id) ?? person.name,
		}));
		page.calculation.participants = page.calculation.participants.map((person) => ({
			...person,
			name: names.get(person.id) ?? person.name,
		}));
		page.state.categories = orderFinanceCategories(
			page.state.categories,
			sources.questions,
		);
		return {
			...page,
			questions: allowsLedger(access, {
				area: "feeCalculation",
				level: "read",
			})
				? sources.questions.filter((q) => !q.archived)
				: [],
		};
	});
}

export async function activateLedger(
	eventId: OffkaiEventId,
	userId: UserId,
	expectedFingerprint: string,
) {
	const access = await accessFor(eventId, userId);
	if (!access.owner)
		throw new AppError("FORBIDDEN", "旧データの切替は主催者が行ってください。");
	await withLedgerTransaction(async (repository) => {
		await repository.lock(eventId);
		if (await repository.exists(eventId))
			throw new AppError(
				"CONFLICT",
				"すでに新方式へ切り替えられています。再読み込みしてください。",
			);
		const state = buildLegacyLedger(await repository.legacy(eventId));
		if (fingerprint(state) !== expectedFingerprint)
			throw new AppError(
				"CONFLICT",
				"旧データが変更されています。プレビューを再読み込みしてください。",
			);
		runBusinessRule(() => calculateFinanceLedger(state));
		await createLedger(repository, eventId, userId, state, "activate");
	});
	return getLedger(eventId, userId);
}

export async function changeLedger(
	eventId: OffkaiEventId,
	userId: UserId,
	body: unknown,
) {
	const access = await accessFor(eventId, userId);
	const command = LedgerCommandSchema.parse(body);
	try {
		await withLedgerTransaction(async (repository) => {
			await repository.lock(eventId);
			const record = await repository.read(eventId);
			if (!record)
				throw new AppError("VALIDATION_ERROR", "新方式への切替が必要です。");
			const state = record.state;
			const repeated = await repository.findRequest(eventId, command.requestId);
			if (repeated) {
				if (repeated.actorId !== userId)
					throw new AppError("CONFLICT", "操作IDが重複しています。");
				return;
			}
			const requirements = ledgerCommandRequirements(state, command);
			if (
				!requirements.length ||
				requirements.some((r) => !allowsLedger(access, r))
			)
				throw new AppError("FORBIDDEN", "この操作を行う権限がありません。");
			if (record.revision !== command.revision)
				throw new AppError(
					"CONFLICT",
					"他の操作で更新されています。再読み込みして差分を確認してください。",
				);
			if (syncFinanceSources(state, await repository.sources(eventId))) {
				const payment =
					command.action === "put" && command.resource === "payments"
						? ledgerResourceSchemas.payments.parse(command.value)
						: null;
				if (
					command.action === "refundPlanned" ||
					command.action === "startSettlement" ||
					payment?.kind === "refund" ||
					payment?.kind === "recovery"
				)
					throw new AppError(
						"CONFLICT",
						"参加回答が変更されています。再読み込みして最新の返金・追加徴収額を確認してください。",
					);
				state.inputRevision++;
			}
			if (
				(command.action === "put" || command.action === "remove") &&
				command.resource === "categories"
			) {
				const value =
					command.action === "put"
						? (command.value as {
								id?: string;
								questionId?: string | null;
								name?: string;
								memberIds?: string[];
							})
						: null;
				const old = state.categories.find(
					(c) =>
						c.id ===
						(value?.id ?? (command.action === "remove" ? command.id : "")),
				);
				if (old?.questionId) {
					if (!value)
						throw new AppError(
							"VALIDATION_ERROR",
							"参加可否質問に対応する区分は削除できません。",
						);
					value.questionId = old.questionId;
					value.name = old.name;
					value.memberIds = old.memberIds;
				} else if (value) value.questionId = null;
			}
			const next = runBusinessRule(() =>
				applyLedgerCommand(state, command, userId, new Date().toISOString()),
			);
			if (!(await repository.advanceRevision(eventId, command.revision)))
				throw new AppError(
					"CONFLICT",
					"同時に更新されました。再読み込みしてください。",
				);
			await repository.write(eventId, next);
			await repository.saveHistory({
				eventId,
				state: next,
				revision: command.revision + 1,
				actorId: userId,
				action: command.action,
				requestId: command.requestId,
				resource:
					"resource" in command
						? command.resource
						: command.action === "participantCharges"
							? "charges"
							: ["collectPlanned", "refundPlanned"].includes(command.action)
								? "payments"
								: command.action,
			});
		});
	} catch (error) {
		rethrowLedgerPersistenceError(error);
	}
	return getLedger(eventId, userId);
}
export async function getLedgerHistory(eventId: OffkaiEventId, userId: UserId) {
	const access = await accessFor(eventId, userId);
	const rows = await new FinanceLedgerRepository().history(eventId);
	return rows.map((row) => ({
		...row,
		state: projectLedger(row.state, row.revision, true, access).state,
	}));
}
