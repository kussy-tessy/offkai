import {
	type ApplicationStartDate,
	type Capacity,
	type CommitmentQuestion,
	type Deadline,
	type EventDate,
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
		};
		const rawCommitmentQuestions =
			record.commitmentQuestions as unknown as RawCommitmentQuestion[];

		return OffkaiEvent.reconstruct({
			id: record.id as OffkaiEventId,
			seriesId: record.seriesId as OffkaiSeriesId,
			name: record.name,
			description: record.description ?? "",
			eventDate: record.eventDate as EventDate,
			applicationStartDate: record.applicationStartDate as ApplicationStartDate,
			commitmentQuestions: rawCommitmentQuestions.map(
				(q): CommitmentQuestion => ({
					id: q.id as QuestionId,
					question: q.question,
					questionShort: q.questionShort,
					deadline: new Date(q.deadline) as Deadline,
					description: q.description,
					capacity: q.capacity as Capacity,
				}),
			),
			preferenceQuestions:
				record.preferenceQuestions as unknown as PreferenceQuestion[],
		});
	}

	async findMyOffkaiEvents(userId: UserId): Promise<OffkaiEventSummary[]> {
		const ownerSeriesMembers = await this.prisma.seriesMember.findMany({
			where: { userId, role: "owner" },
			select: { seriesId: true },
		});
		const ownerSeriesIds = ownerSeriesMembers.map((member) => member.seriesId);
		const ownerSeriesIdSet = new Set(ownerSeriesIds);

		const whereConditions: Array<Record<string, unknown>> = [
			{
				answers: {
					some: {
						userId,
					},
				},
			},
		];

		if (ownerSeriesIds.length > 0) {
			whereConditions.push({
				seriesId: {
					in: ownerSeriesIds,
				},
			});
		}

		const records = await this.prisma.offkaiEvent.findMany({
			where: {
				OR: whereConditions,
			},
			select: {
				id: true,
				name: true,
				eventDate: true,
				description: true,
				seriesId: true,
			},
			orderBy: {
				eventDate: "asc",
			},
		});

		return records.map((record) => ({
			id: record.id as OffkaiEventId,
			title: record.name,
			eventDate: record.eventDate.toISOString(),
			description: record.description ?? "",
			canEdit: ownerSeriesIdSet.has(record.seriesId),
		}));
	}

	async save(event: OffkaiEvent): Promise<void> {
		const props = {
			id: event.id,
			seriesId: event.seriesId,
			name: event.name,
			description: event.description,
			eventDate: event.eventDate,
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
}
