import {
	type OffkaiSeriesId,
	PreferenceQuestionTemplateItemSchema,
	SeriesQuestionTemplate,
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
		});
	}

	async saveQuestionTemplate(template: SeriesQuestionTemplate): Promise<void> {
		await this.prisma.series.update({
			where: { id: template.seriesId },
			data: {
				preferenceQuestionTemplate:
					template.preferenceQuestions as Prisma.InputJsonValue,
			},
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
			throw new AppError(
				"SERIES_NOT_FOUND",
				"管理対象のシリーズが見つかりません。",
			);
		}

		return member;
	}
}
