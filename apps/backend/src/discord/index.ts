import {
	Client,
	type Client as DiscordClient,
	Events,
	GatewayIntentBits,
	type Role,
	type Snowflake,
} from "discord.js";
import { AppError } from "../app-error";

export type DiscordRole = {
	id: Snowflake;
	name: string;
	color: number;
	position: number;
	managed: boolean;
	mentionable: boolean;
	hoist: boolean;
};

type DiscordServiceOptions = {
	client?: DiscordClient;
	token?: string;
	cacheTtlMs?: number;
};

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
	value: T;
	expiresAt: number;
};

export type DiscordUsernameInput = {
	guildId: Snowflake;
	username: string;
	limit?: number;
};

export type DiscordUsernamesInput = {
	guildId: Snowflake;
	usernames: string[];
};

export type DiscordUsernameRoleStatusInput = DiscordUsernamesInput & {
	roleId: Snowflake;
};

export type DiscordMemberRoleProfilesInput = {
	guildId: Snowflake;
	roleId: Snowflake;
	userIds: Snowflake[];
};

export type DiscordMemberRoleProfile = {
	hasRole: boolean;
	avatarUrl: string;
};

export type DiscordUsernameRoleStatus = {
	userId: Snowflake;
	hasRole: boolean;
};

export type DiscordGuildRoleInput = {
	guildId: Snowflake;
	roleId: Snowflake;
};

export type DiscordGuildMemberRoleInput = DiscordGuildRoleInput & {
	userId: Snowflake;
	reason?: string;
};

export class DiscordService {
	private readonly client: DiscordClient;
	private readonly token?: string;
	private readonly cacheTtlMs: number;
	private readonly usernameUserIdCache = new Map<string, CacheEntry<Snowflake | null>>();
	private readyPromise?: Promise<DiscordClient<true>>;

	constructor(options: DiscordServiceOptions = {}) {
		this.client =
			options.client ??
			new Client({
				intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
			});
		this.token = options.token ?? process.env.DISCORD_BOT_TOKEN;
		this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
	}

	async listRoles(guildId: Snowflake): Promise<DiscordRole[]> {
		const guild = await this.fetchGuild(guildId);
		const roles = await this.withDiscordErrorHandling(() => guild.roles.fetch());

		return roles
			.filter((role) => role.id !== guild.id)
			.map((role) => this.toDiscordRole(role))
			.sort((a, b) => b.position - a.position);
	}

	async getUserIdByUsername(
		input: DiscordUsernameInput,
	): Promise<Snowflake | null> {
		const result = await this.getUserIdsByUsernames({
			guildId: input.guildId,
			usernames: [input.username],
		});

		return result.get(input.username) ?? null;
	}

	async getUserIdsByUsernames(
		input: DiscordUsernamesInput,
	): Promise<Map<string, Snowflake>> {
		const result = new Map<string, Snowflake>();
		const uncachedUsernames: string[] = [];

		for (const username of new Set(input.usernames)) {
			const cached = this.getCachedUsernameUserId(input.guildId, username);
			if (cached === undefined) {
				uncachedUsernames.push(username);
				continue;
			}
			if (cached !== null) {
				result.set(username, cached);
			}
		}

		if (uncachedUsernames.length === 0) {
			return result;
		}

		const members = await this.withDiscordErrorHandling(() =>
			this.fetchMembersByUsernames({
				guildId: input.guildId,
				usernames: uncachedUsernames,
			}),
		);
		const unresolved = new Set(uncachedUsernames);

		for (const member of members.values()) {
			if (!result.has(member.user.username)) {
				result.set(member.user.username, member.id);
				this.setCachedUsernameUserId(input.guildId, member.user.username, member.id);
				unresolved.delete(member.user.username);
			}
		}

		for (const username of unresolved) {
			this.setCachedUsernameUserId(input.guildId, username, null);
		}

		return result;
	}

	async getRoleStatusesByUsernames(
		input: DiscordUsernameRoleStatusInput,
	): Promise<Map<string, DiscordUsernameRoleStatus>> {
		const members = await this.withDiscordErrorHandling(() => this.fetchMembersByUsernames(input));
		const result = new Map<string, DiscordUsernameRoleStatus>();

		for (const member of members.values()) {
			if (!result.has(member.user.username)) {
				result.set(member.user.username, {
					userId: member.id,
					hasRole: member.roles.cache.has(input.roleId),
				});
			}
		}

		return result;
	}

	async getMemberRoleProfilesByUserIds(
		input: DiscordMemberRoleProfilesInput,
	): Promise<Map<Snowflake, DiscordMemberRoleProfile>> {
		const result = new Map<Snowflake, DiscordMemberRoleProfile>();
		const guild = await this.fetchGuild(input.guildId);

		await Promise.all(
			input.userIds.map(async (userId) => {
				try {
					const member = await this.withDiscordErrorHandling(() => guild.members.fetch(userId));
					result.set(userId, {
						hasRole: member.roles.cache.has(input.roleId),
						avatarUrl: member.displayAvatarURL({ size: 64 }),
					});
				} catch {
					// Treat a missing guild member as unresolved for the management list.
				}
			}),
		);

		return result;
	}

	async memberHasRole(input: DiscordGuildMemberRoleInput): Promise<boolean> {
		const guild = await this.fetchGuild(input.guildId);
		const member = await this.withDiscordErrorHandling(() => guild.members.fetch(input.userId));

		return member.roles.cache.has(input.roleId);
	}

	async addRoleToMember(input: DiscordGuildMemberRoleInput): Promise<void> {
		const guild = await this.fetchGuild(input.guildId);
		const member = await this.withDiscordErrorHandling(() => guild.members.fetch(input.userId));

		await this.withDiscordErrorHandling(() => member.roles.add(input.roleId, input.reason));
	}

	async removeRoleFromMember(
		input: DiscordGuildMemberRoleInput,
	): Promise<void> {
		const guild = await this.fetchGuild(input.guildId);
		const member = await this.withDiscordErrorHandling(() => guild.members.fetch(input.userId));

		await this.withDiscordErrorHandling(() => member.roles.remove(input.roleId, input.reason));
	}

	async destroy(): Promise<void> {
		this.client.destroy();
		this.readyPromise = undefined;
	}

	private async fetchMembersByUsernames(input: DiscordUsernamesInput) {
		const guild = await this.fetchGuild(input.guildId);
		const usernames = new Set(input.usernames);
		const members = await guild.members.fetch();

		return members.filter((member) => usernames.has(member.user.username));
	}

	private async fetchGuild(guildId: Snowflake) {
		const client = await this.getReadyClient();

		return this.withDiscordErrorHandling(() => client.guilds.fetch(guildId));
	}

	private getCachedUsernameUserId(guildId: Snowflake, username: string): Snowflake | null | undefined {
		const key = this.usernameCacheKey(guildId, username);
		const entry = this.usernameUserIdCache.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt <= Date.now()) {
			this.usernameUserIdCache.delete(key);
			return undefined;
		}

		return entry.value;
	}

	private setCachedUsernameUserId(guildId: Snowflake, username: string, value: Snowflake | null): void {
		this.usernameUserIdCache.set(this.usernameCacheKey(guildId, username), {
			value,
			expiresAt: Date.now() + this.cacheTtlMs,
		});
	}

	private usernameCacheKey(guildId: Snowflake, username: string): string {
		return `${guildId}:${username}`;
	}

	private async withDiscordErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch (cause) {
			const retryAfterSeconds = getDiscordRetryAfterSeconds(cause);
			if (retryAfterSeconds !== null || isDiscordRateLimitError(cause)) {
				const suffix = retryAfterSeconds === null ? "" : ` ${Math.ceil(retryAfterSeconds)}秒後に再試行してください。`;
				throw new AppError("CONFLICT", `Discord APIのレート制限中です。${suffix}`);
			}

			const discordErrorCode = getDiscordErrorCode(cause);
			if (discordErrorCode === 50013) {
				throw new AppError(
					"FORBIDDEN",
					"Discord Botにロールを操作する権限がありません。Botのロール位置とMANAGE_ROLES権限を確認してください。",
				);
			}

			if (isDiscordApiError(cause)) {
				throw new AppError("CONFLICT", "Discord APIの呼び出しに失敗しました。");
			}

			throw cause;
		}
	}

	private async getReadyClient(): Promise<DiscordClient<true>> {
		if (this.client.isReady()) {
			return this.client;
		}

		if (!this.token) {
			throw new Error("DISCORD_BOT_TOKEN is not set.");
		}

		this.readyPromise ??= new Promise<DiscordClient<true>>(
			(resolve, reject) => {
				const onReady = (readyClient: DiscordClient<true>) => {
					resolve(readyClient);
				};

				this.client.once(Events.ClientReady, onReady);
				this.client.login(this.token).catch((error: unknown) => {
					this.client.off(Events.ClientReady, onReady);
					reject(error);
				});
			},
		);

		return this.readyPromise;
	}

	private toDiscordRole(role: Role): DiscordRole {
		return {
			id: role.id,
			name: role.name,
			color: role.color,
			position: role.position,
			managed: role.managed,
			mentionable: role.mentionable,
			hoist: role.hoist,
		};
	}
}

function isDiscordApiError(cause: unknown): boolean {
	if (typeof cause !== "object" || cause === null) return false;
	const maybeDiscordError = cause as { code?: unknown; rawError?: unknown; status?: unknown };
	return (
		typeof maybeDiscordError.code === "number"
		|| typeof maybeDiscordError.status === "number"
		|| maybeDiscordError.rawError !== undefined
	);
}

function getDiscordErrorCode(cause: unknown): number | null {
	if (typeof cause !== "object" || cause === null) return null;
	const maybeDiscordError = cause as {
		code?: unknown;
		rawError?: { code?: unknown };
	};
	const value = maybeDiscordError.code ?? maybeDiscordError.rawError?.code;
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function isDiscordRateLimitError(cause: unknown): boolean {
	if (typeof cause !== "object" || cause === null) return false;
	const maybeDiscordError = cause as { status?: unknown };
	if (maybeDiscordError.status === 429) return true;
	if (!(cause instanceof Error)) return false;
	return cause.name === "GatewayRateLimitError" || cause.message.includes("rate limited");
}

function getDiscordRetryAfterSeconds(cause: unknown): number | null {
	if (typeof cause !== "object" || cause === null) return null;
	const maybeDiscordError = cause as {
		data?: { retry_after?: unknown; retryAfter?: unknown };
		rawError?: { retry_after?: unknown; retryAfter?: unknown };
		retry_after?: unknown;
		retryAfter?: unknown;
	};
	const value = maybeDiscordError.retry_after
		?? maybeDiscordError.retryAfter
		?? maybeDiscordError.rawError?.retry_after
		?? maybeDiscordError.rawError?.retryAfter
		?? maybeDiscordError.data?.retry_after
		?? maybeDiscordError.data?.retryAfter;
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

export const discordService = new DiscordService();
