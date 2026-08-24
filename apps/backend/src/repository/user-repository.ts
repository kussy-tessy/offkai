import { type UserId, User, UserIdSchema } from "@offkai/core";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export class UserRepository {
	private prisma: PrismaClient;
	constructor() {
		this.prisma = prisma;
	}

	async findByLoginId(loginId: string): Promise<User | null> {
		const credential = await this.prisma.passwordCredential.findUnique({
			where: { loginId },
			select: { user: { select: userSelect } },
		});
		return credential ? this.toEntity(credential.user) : null;
	}

	async findByDiscordUserId(discordUserId: string): Promise<User | null> {
		const identity = await this.prisma.discordIdentity.findUnique({
			where: { discordUserId },
			select: { user: { select: userSelect } },
		});
		return identity ? this.toEntity(identity.user) : null;
	}

	async findById(userId: UserId): Promise<User | null> {
		const record = await this.prisma.user.findUnique({
			where: { id: userId },
			select: userSelect,
		});
		return record ? this.toEntity(record) : null;
	}

	async create(user: User): Promise<User> {
		const record = await this.prisma.user.create({
			data: {
				id: user.id,
				name: user.name,
				createdAt: user.createdAt,
				...(user.loginId && user.passwordHash
					? {
							passwordCredential: {
								create: {
									loginId: user.loginId,
									passwordHash: user.passwordHash,
								},
							},
						}
					: {}),
				...(user.discordUserId && user.discordUsername
					? {
							discordIdentity: {
								create: {
									discordUserId: user.discordUserId,
									username: user.discordUsername,
									displayName: user.name,
								},
							},
						}
					: {}),
			},
			select: userSelect,
		});
		return this.toEntity(record);
	}

	async save(user: User): Promise<User> {
		const existing = await this.prisma.user.findUnique({
			where: { id: user.id },
			select: {
				passwordCredential: { select: { userId: true } },
				discordIdentity: { select: { userId: true } },
			},
		});
		if (!existing) throw new Error("User not found");

		const record = await this.prisma.user.update({
			where: { id: user.id },
			data: {
				name: user.name,
				passwordCredential:
					user.loginId && user.passwordHash
						? existing.passwordCredential
							? {
									update: {
										loginId: user.loginId,
										passwordHash: user.passwordHash,
									},
								}
							: {
									create: {
										loginId: user.loginId,
										passwordHash: user.passwordHash,
									},
								}
						: existing.passwordCredential
							? { delete: true }
							: undefined,
				discordIdentity:
					user.discordUserId && user.discordUsername
						? existing.discordIdentity
							? {
									update: {
										discordUserId: user.discordUserId,
										username: user.discordUsername,
									},
								}
							: {
									create: {
										discordUserId: user.discordUserId,
										username: user.discordUsername,
										displayName: user.name,
									},
								}
						: existing.discordIdentity
							? { delete: true }
							: undefined,
			},
			select: userSelect,
		});
		return this.toEntity(record);
	}

	private toEntity(record: UserRecord): User {
		return User.reconstruct({
			id: UserIdSchema.parse(record.id),
			name: record.name,
			loginId: record.passwordCredential?.loginId ?? null,
			passwordHash: record.passwordCredential?.passwordHash ?? null,
			discordUsername: record.discordIdentity?.username ?? null,
			discordUserId: record.discordIdentity?.discordUserId ?? null,
			createdAt: record.createdAt,
		});
	}
}

const userSelect = {
	id: true,
	name: true,
	createdAt: true,
	passwordCredential: { select: { loginId: true, passwordHash: true } },
	discordIdentity: { select: { username: true, discordUserId: true } },
} as const;

type UserRecord = {
	id: string;
	name: string;
	createdAt: Date;
	passwordCredential: { loginId: string; passwordHash: string } | null;
	discordIdentity: { username: string; discordUserId: string } | null;
};
