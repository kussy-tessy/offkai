import {
	ChannelType,
	Client,
	type Client as DiscordClient,
	Events,
	GatewayIntentBits,
	OverwriteType,
	PermissionsBitField,
	type Role,
	type Snowflake,
} from "discord.js";
import { AppError } from "../app-error";

export type DiscordRole = {
	id: Snowflake;
	name: string;
	position: number;
};

export type DiscordCategory = {
	id: Snowflake;
	name: string;
	channels: Array<{ id: Snowflake; name: string }>;
};

export type CreateDiscordChannelRoleInput = {
	guildId: Snowflake;
	category:
		| { mode: "create"; name: string; channelNames: string[] }
		| { mode: "existing"; categoryId: Snowflake };
	role:
		| { mode: "create"; name: string }
		| { mode: "existing"; roleId: Snowflake };
	reason?: string;
};

export type CreateDiscordChannelRoleResult = {
	category: { id: Snowflake; name: string };
	channels: Array<{ id: Snowflake; name: string }>;
	role: { id: Snowflake; name: string };
};

export type DiscordUserProfile = {
	username: string;
	avatarUrl: string;
};

type DiscordServiceOptions = {
	client?: DiscordClient;
	token?: string;
	cacheTtlMs?: number;
};

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

export type DiscordUsernamesInput = {
	guildId: Snowflake;
	usernames: string[];
};

export type DiscordGuildMemberRoleInput = {
	guildId: Snowflake;
	roleId: Snowflake;
	userId: Snowflake;
	reason?: string;
};

export class DiscordService {
	private readonly client: DiscordClient;
	private readonly token?: string;
	private readonly cacheTtlMs: number;
	private readonly usernameUserIdCache = new Map<
		string,
		{ value: Snowflake | null; expiresAt: number }
	>();
	private readonly guildMembershipCache = new Map<
		string,
		{ value: boolean; expiresAt: number }
	>();
	private readonly userProfileCache = new Map<
		Snowflake,
		{ value: DiscordUserProfile | null; expiresAt: number }
	>();
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
		const roles = await this.withDiscordErrorHandling(() =>
			guild.roles.fetch(),
		);

		return roles
			.filter((role) => role.id !== guild.id)
			.map((role) => this.toDiscordRole(role))
			.sort((a, b) => b.position - a.position);
	}

	async listCategories(guildId: Snowflake): Promise<DiscordCategory[]> {
		const guild = await this.fetchGuild(guildId, "fetch-guild-for-categories");
		const channels = await this.withDiscordErrorHandling(
			() => guild.channels.fetch(),
			{ operation: "list-guild-channels", guildId },
		);
		const availableChannels = [...channels.values()].filter(
			(channel) => channel !== null,
		);
		return availableChannels
			.filter((channel) => channel.type === ChannelType.GuildCategory)
			.map((category) => ({
				id: category.id,
				name: category.name,
				channels: availableChannels
					.filter(
						(channel) =>
							channel.parentId === category.id &&
							channel.type === ChannelType.GuildText,
					)
					.map((channel) => ({ id: channel.id, name: channel.name }))
					.sort((a, b) => a.name.localeCompare(b.name, "ja")),
			}))
			.sort((a, b) => a.name.localeCompare(b.name, "ja"));
	}

	async createChannelRoleConfiguration(
		input: CreateDiscordChannelRoleInput,
	): Promise<CreateDiscordChannelRoleResult> {
		const guild = await this.fetchGuild(
			input.guildId,
			"fetch-guild-for-channel-role-setup",
		);
		const createdChannelIds: Snowflake[] = [];
		let createdCategoryId: Snowflake | null = null;
		let createdRoleId: Snowflake | null = null;

		try {
			const botMember =
				guild.members.me ??
				(await this.withDiscordErrorHandling(() => guild.members.fetchMe(), {
					operation: "fetch-bot-member",
					guildId: input.guildId,
				}));
			const roleInput = input.role;
			const role =
				roleInput.mode === "create"
					? await this.withDiscordErrorHandling(
							() =>
								guild.roles.create({
									name: roleInput.name,
									reason: input.reason,
								}),
							{
								operation: "create-role",
								guildId: input.guildId,
								roleName: roleInput.name,
							},
						)
					: await this.withDiscordErrorHandling(
							() => guild.roles.fetch(roleInput.roleId),
							{
								operation: "fetch-role",
								guildId: input.guildId,
								roleId: roleInput.roleId,
							},
						);
			if (!role || role.id === guild.id) {
				throw new AppError(
					"VALIDATION_ERROR",
					"Discordロールが見つかりません。",
				);
			}
			if (roleInput.mode === "create") createdRoleId = role.id;

			const permissionOverwrites = [
				{
					id: botMember.id,
					type: OverwriteType.Member,
					allow: [PermissionsBitField.Flags.ViewChannel],
				},
				{
					id: guild.roles.everyone.id,
					deny: [PermissionsBitField.Flags.ViewChannel],
				},
				{
					id: role.id,
					allow: [
						PermissionsBitField.Flags.ViewChannel,
						PermissionsBitField.Flags.SendMessages,
						PermissionsBitField.Flags.ReadMessageHistory,
					],
				},
			];

			const categoryInput = input.category;
			const category =
				categoryInput.mode === "create"
					? await this.withDiscordErrorHandling(
							() =>
								guild.channels.create({
									name: categoryInput.name,
									type: ChannelType.GuildCategory,
									permissionOverwrites,
									reason: input.reason,
								}),
							{
								operation: "create-category",
								guildId: input.guildId,
								categoryName: categoryInput.name,
								roleId: role.id,
							},
						)
					: await this.withDiscordErrorHandling(
							() => guild.channels.fetch(categoryInput.categoryId),
							{
								operation: "fetch-category",
								guildId: input.guildId,
								categoryId: categoryInput.categoryId,
							},
						);
			if (!category || category.type !== ChannelType.GuildCategory) {
				throw new AppError(
					"VALIDATION_ERROR",
					"Discordカテゴリが見つかりません。",
				);
			}
			if (categoryInput.mode === "create") createdCategoryId = category.id;

			if (categoryInput.mode === "existing") {
				const botPermissions = category.permissionsFor(botMember);
				if (
					!botPermissions?.has(PermissionsBitField.Flags.ViewChannel) ||
					!botPermissions.has(PermissionsBitField.Flags.ManageRoles)
				) {
					throw new AppError(
						"FORBIDDEN",
						"既存カテゴリにKigPla Botの「チャンネルを見る」と「権限の管理」を許可してください。",
					);
				}
				await this.withDiscordErrorHandling(
					() =>
						category.permissionOverwrites.edit(botMember, {
							ViewChannel: true,
						}),
					{
						operation: "set-category-bot-permissions",
						guildId: input.guildId,
						categoryId: category.id,
						botUserId: botMember.id,
					},
				);
				await this.withDiscordErrorHandling(
					() =>
						category.permissionOverwrites.edit(role, {
							ViewChannel: true,
							SendMessages: true,
							ReadMessageHistory: true,
						}),
					{
						operation: "set-category-role-permissions",
						guildId: input.guildId,
						categoryId: category.id,
						roleId: role.id,
					},
				);
				await this.withDiscordErrorHandling(
					() =>
						category.permissionOverwrites.edit(guild.roles.everyone, {
							ViewChannel: false,
						}),
					{
						operation: "set-category-everyone-permissions",
						guildId: input.guildId,
						categoryId: category.id,
					},
				);
			}

			if (categoryInput.mode === "create") {
				for (const name of categoryInput.channelNames) {
					const channel = await this.withDiscordErrorHandling(
						() =>
							guild.channels.create({
								name,
								type: ChannelType.GuildText,
								parent: category.id,
								reason: input.reason,
							}),
						{
							operation: "create-text-channel",
							guildId: input.guildId,
							categoryId: category.id,
							channelName: name,
						},
					);
					createdChannelIds.push(channel.id);
				}
			}

			const guildChannels = await this.withDiscordErrorHandling(
				() => guild.channels.fetch(),
				{
					operation: "list-created-category-channels",
					guildId: input.guildId,
					categoryId: category.id,
				},
			);
			const childChannels = [...guildChannels.values()]
				.filter((channel) => channel !== null)
				.filter(
					(channel) =>
						channel.parentId === category.id &&
						channel.type === ChannelType.GuildText,
				);
			if (categoryInput.mode === "existing") {
				for (const channel of childChannels) {
					const botPermissions = channel.permissionsFor(botMember);
					if (
						!botPermissions?.has(PermissionsBitField.Flags.ViewChannel) ||
						!botPermissions.has(PermissionsBitField.Flags.ManageRoles)
					) {
						throw new AppError(
							"FORBIDDEN",
							`チャンネル「${channel.name}」にKigPla Botの「チャンネルを見る」と「権限の管理」を許可してください。`,
						);
					}
					await this.withDiscordErrorHandling(
						() =>
							channel.permissionOverwrites.edit(botMember, {
								ViewChannel: true,
							}),
						{
							operation: "set-channel-bot-permissions",
							guildId: input.guildId,
							categoryId: category.id,
							channelId: channel.id,
							botUserId: botMember.id,
						},
					);
					await this.withDiscordErrorHandling(
						() =>
							channel.permissionOverwrites.edit(role, {
								ViewChannel: true,
								SendMessages: true,
								ReadMessageHistory: true,
							}),
						{
							operation: "set-channel-role-permissions",
							guildId: input.guildId,
							categoryId: category.id,
							channelId: channel.id,
							roleId: role.id,
						},
					);
					await this.withDiscordErrorHandling(
						() =>
							channel.permissionOverwrites.edit(guild.roles.everyone, {
								ViewChannel: false,
							}),
						{
							operation: "set-channel-everyone-permissions",
							guildId: input.guildId,
							categoryId: category.id,
							channelId: channel.id,
						},
					);
				}
			}
			return {
				category: { id: category.id, name: category.name },
				channels: childChannels.map((channel) => ({
					id: channel.id,
					name: channel.name,
				})),
				role: { id: role.id, name: role.name },
			};
		} catch (cause) {
			for (const channelId of createdChannelIds.reverse()) {
				await guild.channels
					.delete(channelId, "KigPla setup rollback")
					.catch(() => undefined);
			}
			if (createdCategoryId) {
				await guild.channels
					.delete(createdCategoryId, "KigPla setup rollback")
					.catch(() => undefined);
			}
			if (createdRoleId) {
				await guild.roles
					.delete(createdRoleId, "KigPla setup rollback")
					.catch(() => undefined);
			}
			throw cause;
		}
	}

	async getUserIdByUsername(input: {
		guildId: Snowflake;
		username: string;
	}): Promise<Snowflake | null> {
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
				this.setCachedUsernameUserId(
					input.guildId,
					member.user.username,
					member.id,
				);
				unresolved.delete(member.user.username);
			}
		}

		for (const username of unresolved) {
			this.setCachedUsernameUserId(input.guildId, username, null);
		}

		return result;
	}

	async getRoleStatusesByUsernames(
		input: DiscordUsernamesInput & { roleId: Snowflake },
	): Promise<Map<string, { userId: Snowflake; hasRole: boolean }>> {
		const members = await this.withDiscordErrorHandling(() =>
			this.fetchMembersByUsernames(input),
		);
		const result = new Map<string, { userId: Snowflake; hasRole: boolean }>();

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

	async getMemberRoleProfilesByUserIds(input: {
		guildId: Snowflake;
		roleId: Snowflake;
		userIds: Snowflake[];
	}): Promise<Map<Snowflake, { hasRole: boolean; avatarUrl: string }>> {
		const result = new Map<
			Snowflake,
			{ hasRole: boolean; avatarUrl: string }
		>();
		const guild = await this.fetchGuild(input.guildId);

		await Promise.all(
			input.userIds.map(async (userId) => {
				const member = await this.withDiscordErrorHandling(async () => {
					try {
						return await guild.members.fetch(userId);
					} catch (cause) {
						if (getDiscordErrorCode(cause) === 10007) {
							return null;
						}
						throw cause;
					}
				});
				if (member === null) return;

				result.set(userId, {
					hasRole: member.roles.cache.has(input.roleId),
					avatarUrl: member.displayAvatarURL({ size: 64 }),
				});
			}),
		);

		return result;
	}

	async getUserProfile(userId: Snowflake): Promise<DiscordUserProfile | null> {
		const cached = this.userProfileCache.get(userId);
		if (cached && cached.expiresAt > Date.now()) return cached.value;
		if (cached) this.userProfileCache.delete(userId);

		const client = await this.getReadyClient();
		const user = await this.withDiscordErrorHandling(async () => {
			try {
				return await client.users.fetch(userId);
			} catch (cause) {
				if (getDiscordErrorCode(cause) === 10013) return null;
				throw cause;
			}
		});
		const value = user
			? {
					username: user.username,
					avatarUrl: user.displayAvatarURL({ size: 128 }),
				}
			: null;
		this.userProfileCache.set(userId, {
			value,
			expiresAt: Date.now() + this.cacheTtlMs,
		});
		return value;
	}

	async memberHasRole(input: DiscordGuildMemberRoleInput): Promise<boolean> {
		const guild = await this.fetchGuild(input.guildId);
		const member = await this.withDiscordErrorHandling(() =>
			guild.members.fetch(input.userId),
		);

		return member.roles.cache.has(input.roleId);
	}

	async isGuildMember(input: {
		guildId: Snowflake;
		userId: Snowflake;
	}): Promise<boolean> {
		const key = `${input.guildId}:${input.userId}`;
		const cached = this.guildMembershipCache.get(key);
		if (cached && cached.expiresAt > Date.now()) return cached.value;
		if (cached) this.guildMembershipCache.delete(key);

		const guild = await this.fetchGuild(input.guildId);
		const member = await this.withDiscordErrorHandling(async () => {
			try {
				return await guild.members.fetch(input.userId);
			} catch (cause) {
				if (getDiscordErrorCode(cause) === 10007) return null;
				throw cause;
			}
		});
		const value = member !== null;
		this.guildMembershipCache.set(key, {
			value,
			expiresAt: Date.now() + this.cacheTtlMs,
		});
		return value;
	}

	async addRoleToMember(input: DiscordGuildMemberRoleInput): Promise<void> {
		const guild = await this.fetchGuild(input.guildId);
		const member = await this.withDiscordErrorHandling(() =>
			guild.members.fetch(input.userId),
		);

		await this.withDiscordErrorHandling(() =>
			member.roles.add(input.roleId, input.reason),
		);
	}

	async removeRoleFromMember(
		input: DiscordGuildMemberRoleInput,
	): Promise<void> {
		const guild = await this.fetchGuild(input.guildId);
		const member = await this.withDiscordErrorHandling(() =>
			guild.members.fetch(input.userId),
		);

		await this.withDiscordErrorHandling(() =>
			member.roles.remove(input.roleId, input.reason),
		);
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

	private async fetchGuild(guildId: Snowflake, operation = "fetch-guild") {
		const client = await this.getReadyClient();

		return this.withDiscordErrorHandling(() => client.guilds.fetch(guildId), {
			operation,
			guildId,
		});
	}

	private getCachedUsernameUserId(
		guildId: Snowflake,
		username: string,
	): Snowflake | null | undefined {
		const key = this.usernameCacheKey(guildId, username);
		const entry = this.usernameUserIdCache.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt <= Date.now()) {
			this.usernameUserIdCache.delete(key);
			return undefined;
		}

		return entry.value;
	}

	private setCachedUsernameUserId(
		guildId: Snowflake,
		username: string,
		value: Snowflake | null,
	): void {
		this.usernameUserIdCache.set(this.usernameCacheKey(guildId, username), {
			value,
			expiresAt: Date.now() + this.cacheTtlMs,
		});
	}

	private usernameCacheKey(guildId: Snowflake, username: string): string {
		return `${guildId}:${username}`;
	}

	private async withDiscordErrorHandling<T>(
		operation: () => Promise<T>,
		logContext?: Record<string, unknown>,
	): Promise<T> {
		try {
			return await operation();
		} catch (cause) {
			if (logContext) {
				console.error("[discord-api] failure", {
					...logContext,
					...getDiscordErrorLogDetails(cause),
				});
			}
			const retryAfterSeconds = getDiscordRetryAfterSeconds(cause);
			if (retryAfterSeconds !== null || isDiscordRateLimitError(cause)) {
				const suffix =
					retryAfterSeconds === null
						? ""
						: ` ${Math.ceil(retryAfterSeconds)}秒後に再試行してください。`;
				throw new AppError(
					"CONFLICT",
					`Discord APIのレート制限中です。${suffix}`,
				);
			}

			const discordErrorCode = getDiscordErrorCode(cause);
			if (discordErrorCode === 50013) {
				throw new AppError(
					"FORBIDDEN",
					"Discord Botに必要な権限がありません。Botのロール位置とロール・チャンネル管理権限を確認してください。",
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
			position: role.position,
		};
	}
}

function isDiscordApiError(cause: unknown): boolean {
	if (typeof cause !== "object" || cause === null) return false;
	const maybeDiscordError = cause as {
		code?: unknown;
		rawError?: unknown;
		status?: unknown;
	};
	return (
		typeof maybeDiscordError.code === "number" ||
		typeof maybeDiscordError.status === "number" ||
		maybeDiscordError.rawError !== undefined
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

function getDiscordErrorLogDetails(cause: unknown): Record<string, unknown> {
	if (typeof cause !== "object" || cause === null) {
		return { error: String(cause) };
	}
	const discordError = cause as {
		name?: unknown;
		message?: unknown;
		code?: unknown;
		status?: unknown;
		method?: unknown;
		url?: unknown;
		rawError?: {
			code?: unknown;
			message?: unknown;
			errors?: unknown;
		};
	};
	return {
		errorName: discordError.name,
		errorMessage: discordError.message,
		discordCode: discordError.code ?? discordError.rawError?.code,
		httpStatus: discordError.status,
		httpMethod: discordError.method,
		url: discordError.url,
		discordMessage: discordError.rawError?.message,
		discordErrors: discordError.rawError?.errors,
	};
}

function isDiscordRateLimitError(cause: unknown): boolean {
	if (typeof cause !== "object" || cause === null) return false;
	const maybeDiscordError = cause as { status?: unknown };
	if (maybeDiscordError.status === 429) return true;
	if (!(cause instanceof Error)) return false;
	return (
		cause.name === "GatewayRateLimitError" ||
		cause.message.includes("rate limited")
	);
}

function getDiscordRetryAfterSeconds(cause: unknown): number | null {
	if (typeof cause !== "object" || cause === null) return null;
	const maybeDiscordError = cause as {
		data?: { retry_after?: unknown; retryAfter?: unknown };
		rawError?: { retry_after?: unknown; retryAfter?: unknown };
		retry_after?: unknown;
		retryAfter?: unknown;
	};
	const value =
		maybeDiscordError.retry_after ??
		maybeDiscordError.retryAfter ??
		maybeDiscordError.rawError?.retry_after ??
		maybeDiscordError.rawError?.retryAfter ??
		maybeDiscordError.data?.retry_after ??
		maybeDiscordError.data?.retryAfter;
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

export const discordService = new DiscordService();
