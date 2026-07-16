import { v7 as uuidv7 } from "uuid";
import {
	type DiscordUserId,
	type DiscordUsername,
	DiscordUsernameSchema,
	DiscordUserIdSchema,
	type UserId,
	type UserLoginId,
	UserLoginIdSchema,
	type UserName,
	UserNameSchema,
} from "../schema";

export class User {
	private constructor(
		readonly id: UserId,
		readonly loginId: UserLoginId,
		readonly name: UserName,
		readonly passwordHash: string,
		readonly discordUsername: DiscordUsername | null,
		readonly discordUserId: DiscordUserId | null,
		readonly createdAt: Date,
	) {}

	static reconstruct(params: {
		id: UserId;
		loginId: string;
		name: string;
		passwordHash: string;
		discordUsername: string | null;
		discordUserId: string | null;
		createdAt: Date;
	}): User {
		return new User(
			params.id,
			UserLoginIdSchema.parse(params.loginId),
			UserNameSchema.parse(params.name),
			validatePasswordHash(params.passwordHash),
			params.discordUsername === null ? null : DiscordUsernameSchema.parse(params.discordUsername),
			params.discordUserId === null ? null : DiscordUserIdSchema.parse(params.discordUserId),
			params.createdAt,
		);
	}

	static create(params: {
		loginId: string;
		name: string;
		passwordHash: string;
		discordUsername?: string | null;
		discordUserId?: string | null;
	}): User {
		return new User(
			uuidv7() as UserId,
			UserLoginIdSchema.parse(params.loginId),
			UserNameSchema.parse(params.name),
			validatePasswordHash(params.passwordHash),
			params.discordUsername == null ? null : DiscordUsernameSchema.parse(params.discordUsername),
			params.discordUserId == null ? null : DiscordUserIdSchema.parse(params.discordUserId),
			new Date(),
		);
	}

	changeName(name: string): User {
		return new User(
			this.id,
			this.loginId,
			UserNameSchema.parse(name),
			this.passwordHash,
			this.discordUsername,
			this.discordUserId,
			this.createdAt,
		);
	}

	changePasswordHash(passwordHash: string): User {
		return new User(
			this.id,
			this.loginId,
			this.name,
			validatePasswordHash(passwordHash),
			this.discordUsername,
			this.discordUserId,
			this.createdAt,
		);
	}

	connectDiscord(discordUsername: string, discordUserId: string): User {
		return new User(
			this.id,
			this.loginId,
			this.name,
			this.passwordHash,
			DiscordUsernameSchema.parse(discordUsername),
			DiscordUserIdSchema.parse(discordUserId),
			this.createdAt,
		);
	}

	disconnectDiscord(): User {
		return new User(
			this.id,
			this.loginId,
			this.name,
			this.passwordHash,
			null,
			null,
			this.createdAt,
		);
	}
}

function validatePasswordHash(passwordHash: string): string {
	if (passwordHash.length === 0) {
		throw new Error("パスワードハッシュが不正です");
	}
	return passwordHash;
}
