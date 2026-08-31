import {
	type OffkaiSeriesId,
	type DiscordGuildId,
	PreferenceQuestionTemplateItemSchema,
	SeriesQuestionTemplate,
	StaffPermissionsSchema,
	type StaffPermissions,
	type SeriesStaff,
	SeriesStaffSchema,
	type UserId,
} from "@offkai/core";
import type { Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "../app-error";
import { prisma } from "./prisma";

export class SeriesRepository {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prisma;
	}

	async findQuestionTemplateByOwner(
		userId: UserId,
	): Promise<SeriesQuestionTemplate> {
		const member = await this.findOwnerMember(userId);

		return SeriesQuestionTemplate.reconstruct({
			seriesId: member.seriesId as OffkaiSeriesId,
			preferenceQuestions: PreferenceQuestionTemplateItemSchema.array().parse(
				member.series.preferenceQuestionTemplate,
			),
			askBringingKigurumi: member.series.templateAskBringingKigurumi,
			overviewVisibility: member.series.templateOverviewVisibility,
			participantsVisibility: member.series.templateParticipantsVisibility,
			participationEligibility: member.series.templateParticipationEligibility,
		});
	}

	async saveQuestionTemplate(template: SeriesQuestionTemplate): Promise<void> {
		await this.prisma.series.update({
			where: { id: template.seriesId },
			data: {
				preferenceQuestionTemplate:
					template.preferenceQuestions as Prisma.InputJsonValue,
				templateAskBringingKigurumi: template.askBringingKigurumi,
				templateOverviewVisibility: template.overviewVisibility,
				templateParticipantsVisibility: template.participantsVisibility,
				templateParticipationEligibility: template.participationEligibility,
			},
		});
	}

	async findSettingsByOwner(
		userId: UserId,
	): Promise<{ discordGuildId: DiscordGuildId | null }> {
		const member = await this.findOwnerMember(userId);
		return {
			discordGuildId: member.series.discordGuildId as DiscordGuildId | null,
		};
	}

	async updateDiscordGuildIdByOwner(
		userId: UserId,
		discordGuildId: DiscordGuildId | null,
	): Promise<void> {
		const member = await this.findOwnerMember(userId);
		if (!discordGuildId) {
			const templateUsesDiscord =
				member.series.templateOverviewVisibility === "GUILD_MEMBERS" ||
				member.series.templateParticipantsVisibility === "GUILD_MEMBERS" ||
				member.series.templateParticipationEligibility === "GUILD_MEMBERS";
			const eventUsesDiscord = await this.prisma.offkaiEvent.count({
				where: {
					seriesId: member.seriesId,
					OR: [
						{ overviewVisibility: "GUILD_MEMBERS" },
						{ participantsVisibility: "GUILD_MEMBERS" },
						{ participationEligibility: "GUILD_MEMBERS" },
					],
				},
			});
			if (templateUsesDiscord || eventUsesDiscord > 0) {
				throw new AppError(
					"VALIDATION_ERROR",
					"Discordサーバー参加者限定のテンプレートまたはオフ会があるため、Discordサーバー設定を解除できません。",
				);
			}
		}
		await this.prisma.series.update({
			where: { id: member.seriesId },
			data: { discordGuildId },
		});
	}

	async findStaffPermissionsByOwner(userId: UserId): Promise<StaffPermissions> {
		const member = await this.findOwnerMember(userId);
		return StaffPermissionsSchema.parse(member.series.staffPermissions);
	}

	async updateStaffPermissionsByOwner(
		userId: UserId,
		permissions: StaffPermissions,
	): Promise<StaffPermissions> {
		const member = await this.findOwnerMember(userId);
		await this.prisma.series.update({
			where: { id: member.seriesId },
			data: { staffPermissions: permissions as Prisma.InputJsonValue },
		});
		return permissions;
	}

	async findStaffByOwner(userId: UserId): Promise<SeriesStaff[]> {
		const owner = await this.findOwnerMember(userId);
		const members = await this.prisma.seriesMember.findMany({
			where: { seriesId: owner.seriesId, role: "staff" },
			select: {
				userId: true,
				user: {
					select: {
						name: true,
						discordIdentity: { select: { username: true } },
					},
				},
			},
			orderBy: { createdAt: "asc" },
		});

		return members.map((member) =>
			SeriesStaffSchema.parse({
				userId: member.userId,
				userName: member.user.name,
				discordUsername: member.user.discordIdentity?.username ?? null,
			}),
		);
	}

	async findDiscordGuildIdByOwner(
		userId: UserId,
	): Promise<DiscordGuildId | null> {
		const owner = await this.findOwnerMember(userId);
		return owner.series.discordGuildId as DiscordGuildId | null;
	}

	async addStaffByOwner(
		ownerUserId: UserId,
		staffUserId: UserId,
	): Promise<SeriesStaff> {
		const owner = await this.findOwnerMember(ownerUserId);
		const existing = await this.prisma.seriesMember.findUnique({
			where: {
				seriesId_userId: { seriesId: owner.seriesId, userId: staffUserId },
			},
			select: { role: true },
		});
		if (existing?.role === "owner") {
			throw new AppError("CONFLICT", "ownerはスタッフとして追加できません。");
		}
		if (existing) {
			throw new AppError("CONFLICT", "すでにスタッフとして登録されています。");
		}

		try {
			const member = await this.prisma.seriesMember.create({
				data: { seriesId: owner.seriesId, userId: staffUserId, role: "staff" },
				select: {
					userId: true,
					user: {
						select: {
							name: true,
							discordIdentity: { select: { username: true } },
						},
					},
				},
			});
			return SeriesStaffSchema.parse({
				userId: member.userId as UserId,
				userName: member.user.name,
				discordUsername: member.user.discordIdentity?.username ?? null,
			});
		} catch (cause) {
			if (
				typeof cause === "object" &&
				cause !== null &&
				"code" in cause &&
				cause.code === "P2002"
			) {
				throw new AppError(
					"CONFLICT",
					"すでにスタッフとして登録されています。",
				);
			}
			throw cause;
		}
	}

	async removeStaffByOwner(
		ownerUserId: UserId,
		staffUserId: UserId,
	): Promise<void> {
		const owner = await this.findOwnerMember(ownerUserId);
		const result = await this.prisma.seriesMember.deleteMany({
			where: { seriesId: owner.seriesId, userId: staffUserId, role: "staff" },
		});
		if (result.count === 0) {
			throw new AppError(
				"VALIDATION_ERROR",
				"削除対象のスタッフが見つかりません。",
			);
		}
	}

	private async findOwnerMember(userId: UserId) {
		const member = await this.prisma.seriesMember.findFirst({
			where: { userId, role: "owner" },
			select: {
				seriesId: true,
				series: {
					select: {
						preferenceQuestionTemplate: true,
						templateAskBringingKigurumi: true,
						templateOverviewVisibility: true,
						templateParticipantsVisibility: true,
						templateParticipationEligibility: true,
						discordGuildId: true,
						staffPermissions: true,
					},
				},
			},
		});

		if (!member) {
			throw new AppError(
				"SERIES_NOT_FOUND",
				"管理対象のシリーズが見つかりません。",
			);
		}

		return member;
	}
}
