import type { UserId } from "@offkai/core";
import { prisma } from "./prisma";

export class AuthSessionRepository {
	async create(params: {
		id: string;
		userId: UserId;
		refreshTokenHash: string;
		expiresAt: Date;
	}): Promise<void> {
		await prisma.authSession.create({ data: params });
	}

	async rotate(params: {
		id: string;
		currentTokenHash: string;
		newTokenHash: string;
		expiresAt: Date;
	}): Promise<boolean> {
		const now = new Date();
		const result = await prisma.authSession.updateMany({
			where: {
				id: params.id,
				refreshTokenHash: params.currentTokenHash,
				revokedAt: null,
				expiresAt: { gt: now },
			},
			data: {
				refreshTokenHash: params.newTokenHash,
				expiresAt: params.expiresAt,
				lastUsedAt: now,
			},
		});
		return result.count === 1;
	}

	async findUserId(id: string): Promise<UserId | null> {
		const session = await prisma.authSession.findUnique({
			where: { id },
			select: { userId: true },
		});
		return (session?.userId as UserId | undefined) ?? null;
	}

	async revoke(id: string, refreshTokenHash: string): Promise<void> {
		await prisma.authSession.updateMany({
			where: { id, refreshTokenHash, revokedAt: null },
			data: { revokedAt: new Date() },
		});
	}

	async revokeAllForUser(userId: UserId): Promise<void> {
		await prisma.authSession.updateMany({
			where: { userId, revokedAt: null },
			data: { revokedAt: new Date() },
		});
	}
}
