import {
	CreatePhotoShareRequestSchema,
	CreateParticipantExtraChargeRequestSchema,
	CreateSettlementCategoryRequestSchema,
	CreateSettlementExpenseRequestSchema,
	CreateSettlementIncomeRequestSchema,
	DeleteParticipantExtraChargeRequestSchema,
	DeleteSettlementCategoryMemberRequestSchema,
	DeleteSettlementCategoryRequestSchema,
	DeleteSettlementExpenseRequestSchema,
	DeleteSettlementIncomeRequestSchema,
	PhotoShareItemRouteParamsSchema,
	PhotoShareRouteParamsSchema,
	UpdatePhotoDownloadStatusRequestSchema,
	UpdatePhotoShareRequestSchema,
	CreateOffkaiEventRequestSchema,
	GetMyAnswerFormRequestSchema,
	GetOffkaiDetailRequestSchema,
	GetOffkaiEventDiscordRoleMembersRequestSchema,
	GetOffkaiEventRequestSchema,
	GetParticipantPaymentsRequestSchema,
	GetParticipantAnswerTableRequestSchema,
	GetEventFinanceRequestSchema,
	GetEventSettlementRequestSchema,
	GetEventRefundRequestSchema,
	CalculateEventRefundRequestSchema,
	ManageOffkaiAnswerRequestSchema,
	SaveOffkaiAnswerRequestSchema,
	UpdateOffkaiEventDiscordRoleRequestSchema,
	UpdateOffkaiEventDiscordRoleMemberRequestSchema,
	UpdateParticipantPaymentRequestSchema,
	SyncSettlementCategoryMembersRequestSchema,
	UpdateFinanceSettingsRequestSchema,
	UpdateFeeCalculationLockRequestSchema,
	UpdateParticipantExtraChargeRequestSchema,
	UpdateParticipantFinanceNoteRequestSchema,
	UpdateParticipantCollectionRequestSchema,
	UpdateSettlementCategoryMemberRequestSchema,
	UpdateSettlementCategoryRequestSchema,
	UpdateSettlementExpenseRequestSchema,
	UpdateSettlementIncomeRequestSchema,
	UpdateParticipantRefundRequestSchema,
	UserIdSchema,
} from "@offkai/core";
import type { FastifyPluginAsync } from "fastify";
import { getMyAnswerForm } from "./answer-command/get-my-answer-form.usecase";
import {
	getManagedOffkaiAnswerForm,
	saveManagedOffkaiAnswer,
} from "./answer-command/manage-offkai-answer.usecase";
import { saveOffkaiAnswer } from "./answer-command/save-offkai-answer.usecase";
import { getOffkaiDetail } from "./detail-query/get-offkai-detail.usecase";
import {
	getOffkaiEventDiscordRole,
	getOffkaiEventDiscordRoleMembers,
	updateOffkaiEventDiscordRole,
	updateOffkaiEventDiscordRoleMember,
} from "./discord-role";
import { createOffkaiEvent } from "./event-management/create-offkai-event.usecase";
import { deleteOffkaiEvent } from "./event-management/delete-offkai-event.usecase";
import { getMyOffkaiEvents } from "./event-management/get-my-offkai-events.usecase";
import { getOffkaiEvent } from "./event-management/get-offkai-event.usecase";
import { updateOffkaiEvent } from "./event-management/update-offkai-event.usecase";
import { FinanceUsecase, RefundUsecase, SettlementUsecase } from "./finance";
import {
	getParticipantPayments,
	updateParticipantPayment,
} from "./participant-payment";
import { getParticipantAnswerTable } from "./participant-answer-table";
import {
	createPhotoShare,
	deletePhotoShare,
	getPhotoShares,
	updatePhotoDownloadStatus,
	updatePhotoShare,
} from "./photo-sharing";

export const offkaiEventRoute: FastifyPluginAsync = async (app) => {
	const requireUser = { preHandler: app.auth.requireUser };
	const finance = new FinanceUsecase();
	const settlement = new SettlementUsecase();
	const refund = new RefundUsecase();

	app.get("/:eventId/detail", async (request) => {
		const userId = await app.auth.resolveOptionalUser(request);
		const input = GetOffkaiDetailRequestSchema.parse(request.params);
		return getOffkaiDetail(input, userId);
	});

	app.get("/:eventId/photo-shares", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = PhotoShareRouteParamsSchema.parse(request.params);
		return getPhotoShares(input, userId);
	});

	app.post("/:eventId/photo-shares", requireUser, async (request, reply) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = request.params as Record<string, unknown>;
		const body = request.body as Record<string, unknown>;
		const input = CreatePhotoShareRequestSchema.parse({ ...body, ...params });
		const created = await createPhotoShare(input, userId);
		return reply.code(201).send(created);
	});

	app.put(
		"/:eventId/photo-shares/:photoShareId",
		requireUser,
		async (request) => {
			const userId = UserIdSchema.parse(request.user.userId);
			const params = request.params as Record<string, unknown>;
			const body = request.body as Record<string, unknown>;
			const input = UpdatePhotoShareRequestSchema.parse({ ...body, ...params });
			return updatePhotoShare(input, userId);
		},
	);

	app.delete(
		"/:eventId/photo-shares/:photoShareId",
		requireUser,
		async (request, reply) => {
			const userId = UserIdSchema.parse(request.user.userId);
			const input = PhotoShareItemRouteParamsSchema.parse(request.params);
			await deletePhotoShare(input, userId);
			return reply.code(204).send();
		},
	);

	app.put(
		"/:eventId/photo-shares/:photoShareId/download-status",
		requireUser,
		async (request) => {
			const userId = UserIdSchema.parse(request.user.userId);
			const params = request.params as Record<string, unknown>;
			const body = request.body as Record<string, unknown>;
			const input = UpdatePhotoDownloadStatusRequestSchema.parse({
				...body,
				...params,
			});
			return updatePhotoDownloadStatus(input, userId);
		},
	);

	app.get("/my", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return getMyOffkaiEvents(userId);
	});

	app.get("/:id", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = GetOffkaiEventRequestSchema.parse(request.params);
		return getOffkaiEvent(input, userId);
	});

	app.get("/:eventId/discord-role-members", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = GetOffkaiEventDiscordRoleMembersRequestSchema.parse(
			request.params,
		);
		return getOffkaiEventDiscordRoleMembers(input, userId);
	});

	app.get("/:eventId/discord-role", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = GetOffkaiEventDiscordRoleMembersRequestSchema.parse(
			request.params,
		);
		return getOffkaiEventDiscordRole(input, userId);
	});

	app.put("/:eventId/discord-role", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = request.params as Record<string, unknown>;
		const body = request.body as Record<string, unknown>;
		const input = UpdateOffkaiEventDiscordRoleRequestSchema.parse({
			...body,
			...params,
		});
		return updateOffkaiEventDiscordRole(input, userId);
	});

	app.put(
		"/:eventId/discord-role-members/:userId",
		requireUser,
		async (request) => {
			const ownerUserId = UserIdSchema.parse(request.user.userId);
			const params = request.params as Record<string, unknown>;
			const body = request.body as Record<string, unknown>;
			const input = UpdateOffkaiEventDiscordRoleMemberRequestSchema.parse({
				...body,
				...params,
			});
			return updateOffkaiEventDiscordRoleMember(input, ownerUserId);
		},
	);

	app.get("/:eventId/participant-payments", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = GetParticipantPaymentsRequestSchema.parse(request.params);
		return getParticipantPayments(input, userId);
	});

	app.get("/:eventId/finance", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return finance.getPage(
			GetEventFinanceRequestSchema.parse(request.params),
			userId,
		);
	});

	app.put("/:eventId/finance/settings", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return finance.updateSettings(
			UpdateFinanceSettingsRequestSchema.parse({
				...(request.params as object),
				...(request.body as object),
			}),
			userId,
		);
	});

	app.post(
		"/:eventId/finance/fee-calculation-lock",
		requireUser,
		async (request) => {
			const userId = UserIdSchema.parse(request.user.userId);
			return finance.lockFeeCalculation(
				UpdateFeeCalculationLockRequestSchema.parse(request.params),
				userId,
			);
		},
	);

	app.delete(
		"/:eventId/finance/fee-calculation-lock",
		requireUser,
		async (request) => {
			const userId = UserIdSchema.parse(request.user.userId);
			return finance.unlockFeeCalculation(
				UpdateFeeCalculationLockRequestSchema.parse(request.params),
				userId,
			);
		},
	);

	app.post(
		"/:eventId/finance/settlement-categories",
		requireUser,
		async (request, reply) => {
			const userId = UserIdSchema.parse(request.user.userId);
			const result = await finance.createCategory(
				CreateSettlementCategoryRequestSchema.parse({
					...(request.params as object),
					...(request.body as object),
				}),
				userId,
			);
			return reply.code(201).send(result);
		},
	);

	app.put(
		"/:eventId/finance/settlement-categories/:categoryId",
		requireUser,
		async (request) => {
			const userId = UserIdSchema.parse(request.user.userId);
			return finance.updateCategory(
				UpdateSettlementCategoryRequestSchema.parse({
					...(request.params as object),
					...(request.body as object),
				}),
				userId,
			);
		},
	);

	app.delete(
		"/:eventId/finance/settlement-categories/:categoryId",
		requireUser,
		async (request, reply) => {
			const userId = UserIdSchema.parse(request.user.userId);
			await finance.deleteCategory(
				DeleteSettlementCategoryRequestSchema.parse(request.params),
				userId,
			);
			return reply.code(204).send();
		},
	);

	app.post(
		"/:eventId/finance/settlement-categories/:categoryId/sync-members",
		requireUser,
		async (request) => {
			const userId = UserIdSchema.parse(request.user.userId);
			return finance.syncMembers(
				SyncSettlementCategoryMembersRequestSchema.parse(request.params),
				userId,
			);
		},
	);

	app.put(
		"/:eventId/finance/settlement-categories/:categoryId/members/:userId",
		requireUser,
		async (request) => {
			const viewerUserId = UserIdSchema.parse(request.user.userId);
			return finance.updateMember(
				UpdateSettlementCategoryMemberRequestSchema.parse({
					...(request.params as object),
					...(request.body as object),
				}),
				viewerUserId,
			);
		},
	);

	app.delete(
		"/:eventId/finance/settlement-categories/:categoryId/members/:userId",
		requireUser,
		async (request) => {
			const viewerUserId = UserIdSchema.parse(request.user.userId);
			return finance.deleteMember(
				DeleteSettlementCategoryMemberRequestSchema.parse(request.params),
				viewerUserId,
			);
		},
	);

	app.put(
		"/:eventId/finance/participants/:userId/note",
		requireUser,
		async (request) => {
			const viewerUserId = UserIdSchema.parse(request.user.userId);
			return finance.updateParticipantNote(
				UpdateParticipantFinanceNoteRequestSchema.parse({
					...(request.params as object),
					...(request.body as object),
				}),
				viewerUserId,
			);
		},
	);

	app.put(
		"/:eventId/finance/participants/:userId/collection",
		requireUser,
		async (request) => {
			const viewerUserId = UserIdSchema.parse(request.user.userId);
			return finance.updateParticipantCollection(
				UpdateParticipantCollectionRequestSchema.parse({
					...(request.params as object),
					...(request.body as object),
				}),
				viewerUserId,
			);
		},
	);

	app.post(
		"/:eventId/finance/participants/:userId/extra-charges",
		requireUser,
		async (request, reply) => {
			const viewerUserId = UserIdSchema.parse(request.user.userId);
			const result = await finance.createExtraCharge(
				CreateParticipantExtraChargeRequestSchema.parse({
					...(request.params as object),
					...(request.body as object),
				}),
				viewerUserId,
			);
			return reply.code(201).send(result);
		},
	);

	app.put(
		"/:eventId/finance/participants/:userId/extra-charges/:extraChargeId",
		requireUser,
		async (request) => {
			const viewerUserId = UserIdSchema.parse(request.user.userId);
			return finance.updateExtraCharge(
				UpdateParticipantExtraChargeRequestSchema.parse({
					...(request.params as object),
					...(request.body as object),
				}),
				viewerUserId,
			);
		},
	);

	app.delete(
		"/:eventId/finance/participants/:userId/extra-charges/:extraChargeId",
		requireUser,
		async (request) => {
			const viewerUserId = UserIdSchema.parse(request.user.userId);
			return finance.deleteExtraCharge(
				DeleteParticipantExtraChargeRequestSchema.parse(request.params),
				viewerUserId,
			);
		},
	);

	app.get("/:eventId/finance/settlement", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return settlement.getPage(
			GetEventSettlementRequestSchema.parse(request.params),
			userId,
		);
	});

	app.post(
		"/:eventId/finance/settlement-expenses",
		requireUser,
		async (request, reply) => {
			const userId = UserIdSchema.parse(request.user.userId);
			const result = await settlement.createExpense(
				CreateSettlementExpenseRequestSchema.parse({
					...(request.params as object),
					...(request.body as object),
				}),
				userId,
			);
			return reply.code(201).send(result);
		},
	);

	app.put(
		"/:eventId/finance/settlement-expenses/:expenseId",
		requireUser,
		async (request) => {
			const userId = UserIdSchema.parse(request.user.userId);
			return settlement.updateExpense(
				UpdateSettlementExpenseRequestSchema.parse({
					...(request.params as object),
					...(request.body as object),
				}),
				userId,
			);
		},
	);

	app.delete(
		"/:eventId/finance/settlement-expenses/:expenseId",
		requireUser,
		async (request, reply) => {
			const userId = UserIdSchema.parse(request.user.userId);
			await settlement.deleteExpense(
				DeleteSettlementExpenseRequestSchema.parse(request.params),
				userId,
			);
			return reply.code(204).send();
		},
	);

	app.post(
		"/:eventId/finance/settlement-incomes",
		requireUser,
		async (request, reply) => {
			const userId = UserIdSchema.parse(request.user.userId);
			const result = await settlement.createIncome(
				CreateSettlementIncomeRequestSchema.parse({
					...(request.params as object),
					...(request.body as object),
				}),
				userId,
			);
			return reply.code(201).send(result);
		},
	);

	app.put(
		"/:eventId/finance/settlement-incomes/:incomeId",
		requireUser,
		async (request) => {
			const userId = UserIdSchema.parse(request.user.userId);
			return settlement.updateIncome(
				UpdateSettlementIncomeRequestSchema.parse({
					...(request.params as object),
					...(request.body as object),
				}),
				userId,
			);
		},
	);

	app.delete(
		"/:eventId/finance/settlement-incomes/:incomeId",
		requireUser,
		async (request, reply) => {
			const userId = UserIdSchema.parse(request.user.userId);
			await settlement.deleteIncome(
				DeleteSettlementIncomeRequestSchema.parse(request.params),
				userId,
			);
			return reply.code(204).send();
		},
	);

	app.get("/:eventId/finance/refunds", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		return refund.getPage(
			GetEventRefundRequestSchema.parse(request.params),
			userId,
		);
	});

	app.post(
		"/:eventId/finance/refunds/calculate",
		requireUser,
		async (request) => {
			const userId = UserIdSchema.parse(request.user.userId);
			return refund.calculate(
				CalculateEventRefundRequestSchema.parse(request.params),
				userId,
			);
		},
	);

	app.put("/:eventId/finance/refunds/:userId", requireUser, async (request) => {
		const viewerUserId = UserIdSchema.parse(request.user.userId);
		return refund.updateParticipant(
			UpdateParticipantRefundRequestSchema.parse({
				...(request.params as object),
				...(request.body as object),
			}),
			viewerUserId,
		);
	});
	app.get(
		"/:eventId/participant-answer-table",
		requireUser,
		async (request) => {
			const userId = UserIdSchema.parse(request.user.userId);
			const input = GetParticipantAnswerTableRequestSchema.parse(
				request.params,
			);
			return getParticipantAnswerTable(input, userId);
		},
	);

	app.put(
		"/:eventId/participant-payments/:userId",
		requireUser,
		async (request) => {
			const viewerUserId = UserIdSchema.parse(request.user.userId);
			const params = request.params as Record<string, unknown>;
			const body = request.body as Record<string, unknown>;
			const input = UpdateParticipantPaymentRequestSchema.parse({
				...body,
				...params,
			});
			return updateParticipantPayment(input, viewerUserId);
		},
	);

	app.get("/:eventId/my-answer-form", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = GetMyAnswerFormRequestSchema.parse(request.params);
		return getMyAnswerForm(input, userId);
	});

	app.get("/:eventId/answers/:userId/form", requireUser, async (request) => {
		const ownerUserId = UserIdSchema.parse(request.user.userId);
		const input = ManageOffkaiAnswerRequestSchema.parse(request.params);
		return getManagedOffkaiAnswerForm(input, ownerUserId);
	});

	app.post("/", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const input = CreateOffkaiEventRequestSchema.parse(request.body);
		return createOffkaiEvent(input, userId);
	});

	app.put("/:id", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = GetOffkaiEventRequestSchema.parse(request.params);
		const input = CreateOffkaiEventRequestSchema.parse(request.body);
		return updateOffkaiEvent(params, input, userId);
	});

	app.delete("/:id", requireUser, async (request, reply) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = GetOffkaiEventRequestSchema.parse(request.params);
		await deleteOffkaiEvent(params, userId);
		return reply.code(204).send();
	});

	app.put("/:eventId/answers/:userId", requireUser, async (request) => {
		const ownerUserId = UserIdSchema.parse(request.user.userId);
		const params = ManageOffkaiAnswerRequestSchema.parse(request.params);
		const body = request.body as Record<string, unknown>;
		const input = SaveOffkaiAnswerRequestSchema.parse({
			...body,
			eventId: params.eventId,
		});
		return saveManagedOffkaiAnswer(params, input, ownerUserId);
	});

	app.put("/:eventId/answers", requireUser, async (request) => {
		const userId = UserIdSchema.parse(request.user.userId);
		const params = request.params as Record<string, unknown>;
		const body = request.body as Record<string, unknown>;
		const input = SaveOffkaiAnswerRequestSchema.parse({
			...body,
			eventId: params.eventId,
		});
		return saveOffkaiAnswer(input, userId);
	});
};
