import {
	type ApplicationStartDate,
	type CommitmentQuestion,
	type EventDate,
	OffkaiEvent,
	type OffkaiEventId,
	type OffkaiEventSummary,
	type OffkaiSeriesId,
	type PreferenceQuestion,
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

		return OffkaiEvent.reconstruct({
			id: record.id as OffkaiEventId,
			seriesId: record.seriesId as OffkaiSeriesId,
			name: record.name,
			description: record.description ?? "",
			eventDate: record.eventDate as EventDate,
			applicationStartDate: record.applicationStartDate as ApplicationStartDate,
			commitmentQuestions:
				record.commitmentQuestions as unknown as CommitmentQuestion[],
			preferenceQuestions:
				record.preferenceQuestions as unknown as PreferenceQuestion[],
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
				eventDate: true,
				description: true,
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
