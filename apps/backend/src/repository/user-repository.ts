import { type UserId, User, UserIdSchema } from "@offkai/core";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export class UserRepository {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prisma;
	}

	async findByLoginId(loginId: string): Promise<User | null> {
		const record = await this.prisma.user.findUnique({
			where: { loginId },
			select: userSelect,
		});

		return record === null ? null : this.toEntity(record);
	}

	async findByDiscordUsername(discordUsername: string): Promise<User | null> {
		const record = await this.prisma.user.findUnique({
			where: { discordUsername },
			select: userSelect,
		});

		return record === null ? null : this.toEntity(record);
	}

	async findById(userId: UserId): Promise<User | null> {
		const record = await this.prisma.user.findUnique({
			where: { id: userId },
			select: userSelect,
		});

		return record === null ? null : this.toEntity(record);
	}

	async create(user: User): Promise<User> {
		const record = await this.prisma.user.create({
			data: {
				id: user.id,
				loginId: user.loginId,
				name: user.name,
				passwordHash: user.passwordHash,
				discordUsername: user.discordUsername,
				createdAt: user.createdAt,
			},
			select: userSelect,
		});

		return this.toEntity(record);
	}

	async save(user: User): Promise<User> {
		const record = await this.prisma.user.update({
			where: { id: user.id },
			data: {
				name: user.name,
				passwordHash: user.passwordHash,
				discordUsername: user.discordUsername,
			},
			select: userSelect,
		});

		return this.toEntity(record);
	}

	private toEntity(record: UserRecord): User {
		return User.reconstruct({
			id: UserIdSchema.parse(record.id),
			loginId: record.loginId,
			name: record.name,
			passwordHash: record.passwordHash,
			discordUsername: record.discordUsername,
			createdAt: record.createdAt,
		});
	}
}

const userSelect = {
	id: true,
	loginId: true,
	name: true,
	passwordHash: true,
	discordUsername: true,
	createdAt: true,
} as const;

type UserRecord = {
	id: string;
	loginId: string;
	name: string;
	passwordHash: string;
	discordUsername: string | null;
	createdAt: Date;
};
