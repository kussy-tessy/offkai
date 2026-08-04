import {
	type ApplicationStartDate,
	type Capacity,
	type DiscordGuildId,
	type DiscordRoleId,
	type DiscordUserId,
	type DiscordUsername,
	type CommitmentQuestion,
	type Deadline,
	type EventVisibility,
	EventPeriodSchema,
	OffkaiEvent,
	type OffkaiEventId,
	type OffkaiEventSummary,
	type OffkaiSeriesId,
	type PreferenceQuestion,
	type QuestionId,
	SeriesRoleSchema,
	type SeriesRole,
	type UserId,
	type UserName,
} from "@offkai/core";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "../app-error";
import { prisma } from "./prisma";

export class OffkaiEventRepository {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prisma;
	}

	async findById(id: string): Promise<OffkaiEvent> {
		const record = await this.prisma.offkaiEvent.findUnique({
			where: { id },
		});

		if (!record) {
			throw new AppError("EVENT_NOT_FOUND", "オフ会が見つかりません。");
		}

		type RawCommitmentQuestion = {
			id: string;
			question: string;
			questionShort: string;
			deadline: string;
			description: string;
			capacity: number;
			required?: boolean;
		};
		type RawPreferenceQuestion = {
			id: string;
			question: string;
			questionShort: string;
			required?: boolean;
			answerTemplate: PreferenceQuestion["answerTemplate"];
		};
		const rawCommitmentQuestions =
			record.commitmentQuestions as unknown as RawCommitmentQuestion[];
		const rawPreferenceQuestions =
			record.preferenceQuestions as unknown as RawPreferenceQuestion[];

		return OffkaiEvent.reconstruct({
			id: record.id as OffkaiEventId,
			seriesId: record.seriesId as OffkaiSeriesId,
			name: record.name,
			description: record.description ?? "",
			eventPeriod: EventPeriodSchema.parse({
				startDate: record.eventStartDate,
				endDate: record.eventEndDate,
			}),
			applicationStartDate: record.applicationStartDate as ApplicationStartDate,
			discordRoleId: record.discordRoleId as DiscordRoleId | null,
			askBringingKigurumi: record.askBringingKigurumi,
			overviewVisibility: record.overviewVisibility as EventVisibility,
			participantsVisibility: record.participantsVisibility as EventVisibility,
			commitmentQuestions: rawCommitmentQuestions.map(
				(q): CommitmentQuestion => ({
					id: q.id as QuestionId,
					question: q.question,
					questionShort: q.questionShort,
					deadline: new Date(q.deadline) as Deadline,
					description: q.description,
					capacity: q.capacity as Capacity,
					required: q.required ?? false,
				}),
			),
			preferenceQuestions: rawPreferenceQuestions.map(
				(q): PreferenceQuestion => ({
					id: q.id as QuestionId,
					question: q.question,
					questionShort: q.questionShort,
					required: q.required ?? false,
					answerTemplate: q.answerTemplate,
				}),
			),
		});
	}

	async findMyOffkaiEvents(userId: UserId): Promise<OffkaiEventSummary[]> {
		const records = await this.prisma.offkaiEvent.findMany({
			where: {
				OR: [
					{
						answers: {
							some: {
								userId,
							},
						},
					},
					{
						series: {
							members: {
								some: {
									userId,
								},
							},
						},
					},
				],
			},
			select: {
				id: true,
				name: true,
				eventStartDate: true,
				eventEndDate: true,
				description: true,
				series: {
					select: {
						members: {
							where: {
								userId,
							},
							select: {
								role: true,
							},
						},
					},
				},
			},
			orderBy: {
				eventStartDate: "asc",
			},
		});

		return records.map((record) => ({
			id: record.id as OffkaiEventId,
			title: record.name,
			eventPeriod: {
				startDate: record.eventStartDate.toISOString().slice(0, 10),
				endDate: record.eventEndDate.toISOString().slice(0, 10),
			},
			description: record.description ?? "",
			seriesRole: record.series.members[0]
				? SeriesRoleSchema.parse(record.series.members[0].role)
				: null,
		}));
	}

	async save(event: OffkaiEvent): Promise<void> {
		const props = {
			id: event.id,
			seriesId: event.seriesId,
			name: event.name,
			description: event.description,
			eventStartDate: event.eventPeriod.startDate,
			eventEndDate: event.eventPeriod.endDate,
			applicationStartDate: event.applicationStartDate,
			discordRoleId: event.discordRoleId,
			askBringingKigurumi: event.askBringingKigurumi,
			overviewVisibility: event.overviewVisibility,
			participantsVisibility: event.participantsVisibility,
			commitmentQuestions: event.commitmentQuestions,
			preferenceQuestions: event.preferenceQuestions,
		};

		await this.prisma.offkaiEvent.upsert({
			where: { id: props.id },
			create: props,
			update: props,
		});
	}

	async updateDiscordRoleId(
		id: OffkaiEventId,
		discordRoleId: DiscordRoleId | null,
	): Promise<void> {
		await this.prisma.offkaiEvent.update({
			where: { id },
			data: { discordRoleId },
		});
	}

	async delete(id: string): Promise<void> {
		await this.prisma.$transaction(async (tx) => {
			await tx.offkaiAnswerHistory.deleteMany({
				where: { eventId: id },
			});
			await tx.offkaiAnswer.deleteMany({
				where: { eventId: id },
			});
			await tx.offkaiEvent.delete({
				where: { id },
			});
		});
	}

	async findOwnerSeriesId(userId: UserId): Promise<OffkaiSeriesId> {
		const member = await this.prisma.seriesMember.findFirst({
			where: { userId, role: "owner" },
			select: { seriesId: true },
		});
		if (!member) {
			throw new AppError("SERIES_NOT_FOUND", "管理対象のシリーズが見つかりません。");
		}
		return member.seriesId as OffkaiSeriesId;
	}


	async findAllSeriesDiscordGuildIds(): Promise<DiscordGuildId[]> {
		const series = await this.prisma.series.findMany({
			where: { discordGuildId: { not: null } },
			select: { discordGuildId: true },
		});

		return series.flatMap((item) =>
			item.discordGuildId ? [item.discordGuildId as DiscordGuildId] : [],
		);
	}

	async findOwnerSeriesDiscordGuildIds(userId: UserId): Promise<DiscordGuildId[]> {
		const members = await this.prisma.seriesMember.findMany({
			where: { userId, role: "owner" },
			select: {
				series: {
					select: { discordGuildId: true },
				},
			},
		});
		if (members.length === 0) {
			throw new AppError("SERIES_NOT_FOUND", "管理対象のシリーズが見つかりません。");
		}

		return members.flatMap((member) =>
			member.series.discordGuildId ? [member.series.discordGuildId as DiscordGuildId] : [],
		);
	}

	async findOwnerSeriesDiscordGuildId(userId: UserId): Promise<DiscordGuildId | null> {
		const member = await this.prisma.seriesMember.findFirst({
			where: { userId, role: "owner" },
			select: {
				series: {
					select: { discordGuildId: true },
				},
			},
		});
		if (!member) {
			throw new AppError("SERIES_NOT_FOUND", "管理対象のシリーズが見つかりません。");
		}

		return member.series.discordGuildId as DiscordGuildId | null;
	}

	async findSeriesDiscordGuildId(seriesId: OffkaiSeriesId): Promise<DiscordGuildId | null> {
		const series = await this.prisma.series.findUnique({
			where: { id: seriesId },
			select: { discordGuildId: true },
		});
		if (!series) {
			throw new AppError("SERIES_NOT_FOUND", "シリーズが見つかりません。");
		}

		return series.discordGuildId as DiscordGuildId | null;
	}

	async findRespondentUsersByEventId(eventId: OffkaiEventId): Promise<OffkaiEventRespondentUser[]> {
		const records = await this.prisma.offkaiAnswer.findMany({
			where: { eventId },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			select: {
				user: {
					select: {
						id: true,
						name: true,
						discordUsername: true,
						discordUserId: true,
					},
				},
			},
		});

		return records.map((record) => ({
			userId: record.user.id as UserId,
			displayName: record.user.name as UserName,
			discordUsername: record.user.discordUsername as DiscordUsername | null,
			discordUserId: record.user.discordUserId as DiscordUserId | null,
		}));
	}

	async findRespondentUserByEventAndUser(
		eventId: OffkaiEventId,
		userId: UserId,
	): Promise<OffkaiEventRespondentUser | null> {
		const record = await this.prisma.offkaiAnswer.findUnique({
			where: {
				eventId_userId: {
					eventId,
					userId,
				},
			},
			select: {
				user: {
					select: {
						id: true,
						name: true,
						discordUsername: true,
						discordUserId: true,
					},
				},
			},
		});

		if (!record) return null;

		return {
			userId: record.user.id as UserId,
			displayName: record.user.name as UserName,
			discordUsername: record.user.discordUsername as DiscordUsername | null,
			discordUserId: record.user.discordUserId as DiscordUserId | null,
		};
	}

	async findSeriesMemberRole(
		userId: UserId,
		seriesId: OffkaiSeriesId,
	): Promise<SeriesRole | null> {
		const member = await this.prisma.seriesMember.findUnique({
			where: {
				seriesId_userId: {
					seriesId,
					userId,
				},
			},
			select: { role: true },
		});

		return member ? SeriesRoleSchema.parse(member.role) : null;
	}

	async isParticipant(eventId: OffkaiEventId, userId: UserId): Promise<boolean> {
		const answer = await this.prisma.offkaiAnswer.findUnique({
			where: { eventId_userId: { eventId, userId } },
			select: { id: true },
		});
		return answer !== null;
	}
}

export type OffkaiEventRespondentUser = {
	userId: UserId;
	displayName: UserName;
	discordUsername: DiscordUsername | null;
	discordUserId: DiscordUserId | null;
};
