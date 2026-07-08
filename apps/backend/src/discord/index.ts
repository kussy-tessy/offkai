import {
	Client,
	type Client as DiscordClient,
	Events,
	GatewayIntentBits,
	type Role,
	type Snowflake,
} from "discord.js";

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
	guildId?: Snowflake;
};

export type DiscordUsernameInput = {
	guildId?: Snowflake;
	username: string;
	limit?: number;
};

export type DiscordGuildRoleInput = {
	guildId?: Snowflake;
	roleId: Snowflake;
};

export type DiscordGuildMemberRoleInput = DiscordGuildRoleInput & {
	userId: Snowflake;
	reason?: string;
};

export class DiscordService {
	private readonly client: DiscordClient;
	private readonly token?: string;
	private readonly defaultGuildId?: Snowflake;
	private readyPromise?: Promise<DiscordClient<true>>;

	constructor(options: DiscordServiceOptions = {}) {
		this.client =
			options.client ??
			new Client({
				intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
			});
		this.token = options.token ?? process.env.DISCORD_BOT_TOKEN;
		this.defaultGuildId = options.guildId ?? process.env.DISCORD_GUILD_ID;
	}

	async listRoles(guildId?: Snowflake): Promise<DiscordRole[]> {
		const guild = await this.fetchGuild(guildId);
		const roles = await guild.roles.fetch();

		return roles
			.filter((role) => role.id !== guild.id)
			.map((role) => this.toDiscordRole(role))
			.sort((a, b) => b.position - a.position);
	}

	async getUserIdByUsername(
		input: DiscordUsernameInput,
	): Promise<Snowflake | null> {
		const guild = await this.fetchGuild(input.guildId);
		const members = await guild.members.fetch({
			query: input.username,
			limit: input.limit ?? 100,
		});
		const member = members.find(
			(member) => member.user.username === input.username,
		);

		return member?.id ?? null;
	}

	async memberHasRole(input: DiscordGuildMemberRoleInput): Promise<boolean> {
		const guild = await this.fetchGuild(input.guildId);
		const member = await guild.members.fetch(input.userId);

		return member.roles.cache.has(input.roleId);
	}

	async addRoleToMember(input: DiscordGuildMemberRoleInput): Promise<void> {
		const guild = await this.fetchGuild(input.guildId);
		const member = await guild.members.fetch(input.userId);

		await member.roles.add(input.roleId, input.reason);
	}

	async removeRoleFromMember(
		input: DiscordGuildMemberRoleInput,
	): Promise<void> {
		const guild = await this.fetchGuild(input.guildId);
		const member = await guild.members.fetch(input.userId);

		await member.roles.remove(input.roleId, input.reason);
	}

	async destroy(): Promise<void> {
		this.client.destroy();
		this.readyPromise = undefined;
	}

	private async fetchGuild(guildId?: Snowflake) {
		const client = await this.getReadyClient();
		const resolvedGuildId = this.resolveGuildId(guildId);

		return client.guilds.fetch(resolvedGuildId);
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

	private resolveGuildId(guildId?: Snowflake): Snowflake {
		const resolvedGuildId = guildId ?? this.defaultGuildId;
		if (!resolvedGuildId) {
			throw new Error("Discord guild id is not set.");
		}

		return resolvedGuildId;
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

export const discordService = new DiscordService();
