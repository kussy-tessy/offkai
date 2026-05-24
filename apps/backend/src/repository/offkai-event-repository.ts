import {
	type ApplicationStartDate,
	type Capacity,
	type CommitmentQuestion,
	type Deadline,
	EventPeriodSchema,
	OffkaiEvent,
	type OffkaiEventId,
	type OffkaiEventSummary,
	type OffkaiSeriesId,
	type PreferenceQuestion,
	type QuestionId,
	type UserId,
} from "@offkai/core";
import type { PrismaClient } from "@prisma/client";
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

		if (!record) throw new Error(`オフ会が見つかりません: ${id}`);

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
									role: "owner",
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
								role: "owner",
							},
							select: {
								userId: true,
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
			canEdit: record.series.members.length > 0,
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
			commitmentQuestions: event.commitmentQuestions,
			preferenceQuestions: event.preferenceQuestions,
		};

		await this.prisma.offkaiEvent.upsert({
			where: { id: props.id },
			create: props,
			update: props,
		});
	}

	async delete(id: string): Promise<void> {
		await this.prisma.offkaiEvent.delete({
			where: { id },
		});
	}

	async findOwnerSeriesId(userId: UserId): Promise<OffkaiSeriesId> {
		const member = await this.prisma.seriesMember.findFirst({
			where: { userId, role: "owner" },
			select: { seriesId: true },
		});
		if (!member) {
			throw new Error(`オーナーのシリーズが見つかりません: ${userId}`);
		}
		return member.seriesId as OffkaiSeriesId;
	}

	async findSeriesMemberRole(
		userId: UserId,
		seriesId: OffkaiSeriesId,
	): Promise<string | null> {
		const member = await this.prisma.seriesMember.findUnique({
			where: {
				seriesId_userId: {
					seriesId,
					userId,
				},
			},
			select: { role: true },
		});

		return member?.role ?? null;
	}
}
