import {
	SeriesQuestionTemplateSchema,
	type SeriesQuestionTemplate,
	type UserId,
} from "@offkai/core";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export class SeriesRepository {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prisma;
	}

	async getQuestionTemplateByOwner(
		userId: UserId,
	): Promise<SeriesQuestionTemplate> {
		const member = await this.findOwnerMember(userId);

		return SeriesQuestionTemplateSchema.parse({
			preferenceQuestions: member.series.preferenceQuestionTemplate,
		});
	}

	async updateQuestionTemplateByOwner(
		userId: UserId,
		template: SeriesQuestionTemplate,
	): Promise<SeriesQuestionTemplate> {
		const member = await this.findOwnerMember(userId);

		const series = await this.prisma.series.update({
			where: { id: member.seriesId },
			data: {
				preferenceQuestionTemplate:
					template.preferenceQuestions as Prisma.InputJsonValue,
			},
			select: { preferenceQuestionTemplate: true },
		});

		return SeriesQuestionTemplateSchema.parse({
			preferenceQuestions: series.preferenceQuestionTemplate,
		});
	}

	private async findOwnerMember(userId: UserId) {
		const member = await this.prisma.seriesMember.findFirst({
			where: { userId, role: "owner" },
			select: {
				seriesId: true,
				series: {
					select: { preferenceQuestionTemplate: true },
				},
			},
		});

		if (!member) {
			throw new Error(`オーナーのシリーズが見つかりません: ${userId}`);
		}

		return member;
	}
}
