import {
	type ApplicationStartDate,
	type CommitmentQuestion,
	type EventDate,
	OffkaiEvent,
	type OffkaiEventId,
	type OffkaiSeriesId,
	type PreferenceQuestion,
} from "@offkai/core";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export class OffkaiEventRepository {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prisma;
	}

	async findById(id: string): Promise<OffkaiEvent | null> {
		const record = await this.prisma.offkaiEvent.findUnique({
			where: { id },
		});

		if (!record) return null;

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
}
