import {
	type CreateKigurumiRequest,
	type Kigurumi,
	type KigurumiId,
	type UserId,
} from "@offkai/core";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "../app-error";
import { prisma } from "./prisma";

export class KigurumiRepository {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prisma;
	}

	async findManyByOwnerUserId(ownerUserId: UserId): Promise<Kigurumi[]> {
		const records = await this.prisma.kigurumi.findMany({
			where: { ownerUserId },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		});

		return records.map((record) => ({
			id: record.id as KigurumiId,
			ownerUserId: record.ownerUserId as UserId,
			title: record.title,
			character: record.character,
		}));
	}

	async create(
		input: CreateKigurumiRequest,
		ownerUserId: UserId,
	): Promise<Kigurumi> {
		const record = await this.prisma.kigurumi.create({
			data: {
				ownerUserId,
				title: input.title,
				character: input.character,
			},
		});

		return {
			id: record.id as KigurumiId,
			ownerUserId: record.ownerUserId as UserId,
			title: record.title,
			character: record.character,
		};
	}

	async delete(id: KigurumiId, ownerUserId: UserId): Promise<void> {
		const record = await this.prisma.kigurumi.findUnique({
			where: { id },
			select: { ownerUserId: true },
		});

		if (!record) {
			throw new AppError(
				"KIGURUMI_NOT_FOUND",
				"着ぐるみさんが見つかりません。",
			);
		}
		if (record.ownerUserId !== ownerUserId) {
			throw new AppError(
				"FORBIDDEN",
				"この着ぐるみさんを削除する権限がありません。",
			);
		}

		await this.prisma.kigurumi.delete({ where: { id } });
	}
}
