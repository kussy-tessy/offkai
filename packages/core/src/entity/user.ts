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
		readonly name: UserName,
		readonly loginId: UserLoginId | null,
		readonly passwordHash: string | null,
		readonly discordUsername: DiscordUsername | null,
		readonly discordUserId: DiscordUserId | null,
		readonly createdAt: Date,
	) {
		if (!passwordHash && !discordUserId)
			throw new Error("ログイン手段が必要です");
		if ((loginId === null) !== (passwordHash === null)) {
			throw new Error("ログインIDとパスワードは同時に設定してください");
		}
	}

	static reconstruct(params: {
		id: UserId;
		name: string;
		loginId: string | null;
		passwordHash: string | null;
		discordUsername: string | null;
		discordUserId: string | null;
		createdAt: Date;
	}): User {
		return new User(
			params.id,
			UserNameSchema.parse(params.name),
			params.loginId === null ? null : UserLoginIdSchema.parse(params.loginId),
			params.passwordHash === null
				? null
				: validatePasswordHash(params.passwordHash),
			params.discordUsername === null
				? null
				: DiscordUsernameSchema.parse(params.discordUsername),
			params.discordUserId === null
				? null
				: DiscordUserIdSchema.parse(params.discordUserId),
			params.createdAt,
		);
	}

	static createWithPassword(params: {
		loginId: string;
		name: string;
		passwordHash: string;
	}): User {
		return new User(
			uuidv7() as UserId,
			UserNameSchema.parse(params.name),
			UserLoginIdSchema.parse(params.loginId),
			validatePasswordHash(params.passwordHash),
			null,
			null,
			new Date(),
		);
	}

	static createWithDiscord(params: {
		name: string;
		discordUsername: string;
		discordUserId: string;
	}): User {
		return new User(
			uuidv7() as UserId,
			UserNameSchema.parse(params.name),
			null,
			null,
			DiscordUsernameSchema.parse(params.discordUsername),
			DiscordUserIdSchema.parse(params.discordUserId),
			new Date(),
		);
	}

	changeName(name: string): User {
		return this.copy({ name: UserNameSchema.parse(name) });
	}

	setPasswordCredential(loginId: string, passwordHash: string): User {
		return this.copy({
			loginId: UserLoginIdSchema.parse(loginId),
			passwordHash: validatePasswordHash(passwordHash),
		});
	}

	changePasswordHash(passwordHash: string): User {
		if (!this.loginId || !this.passwordHash)
			throw new Error("パスワードが未設定です");
		return this.copy({ passwordHash: validatePasswordHash(passwordHash) });
	}

	connectDiscord(discordUsername: string, discordUserId: string): User {
		return this.copy({
			discordUsername: DiscordUsernameSchema.parse(discordUsername),
			discordUserId: DiscordUserIdSchema.parse(discordUserId),
		});
	}

	disconnectDiscord(): User {
		if (!this.passwordHash)
			throw new Error("最後のログイン手段は解除できません");
		return this.copy({ discordUsername: null, discordUserId: null });
	}

	private copy(
		changes: Partial<{
			name: UserName;
			loginId: UserLoginId | null;
			passwordHash: string | null;
			discordUsername: DiscordUsername | null;
			discordUserId: DiscordUserId | null;
		}>,
	): User {
		return new User(
			this.id,
			changes.name ?? this.name,
			changes.loginId !== undefined ? changes.loginId : this.loginId,
			changes.passwordHash !== undefined
				? changes.passwordHash
				: this.passwordHash,
			changes.discordUsername !== undefined
				? changes.discordUsername
				: this.discordUsername,
			changes.discordUserId !== undefined
				? changes.discordUserId
				: this.discordUserId,
			this.createdAt,
		);
	}
}

function validatePasswordHash(passwordHash: string): string {
	if (passwordHash.length === 0)
		throw new Error("パスワードハッシュが不正です");
	return passwordHash;
}
