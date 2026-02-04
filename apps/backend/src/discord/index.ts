import { Client, Events, GatewayIntentBits } from "discord.js";
import "dotenv/config";

// ===== 設定値 =====
const GUILD_ID = "1125031027350454353";

// ===== Client 作成 =====
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, async () => {
	console.log(`Logged in as ${client.user?.tag}`);

	// サーバー取得
	const guild = await client.guilds.fetch(GUILD_ID);

	// メンバー取得
	await guild.members.fetch(); // 全員フェッチ
	const targetMember = guild.members.cache.find(
		(m) => m.user.username === "kussy_tessy.",
	);

	// ロール取得
	await guild.roles.fetch();
	const targetRole = guild.roles.cache.find(
		(r) => r.name === "テストカテゴリが見られるロール",
	);

	// ロール付与
	if (targetMember && targetRole) {
		await targetMember?.roles.add(targetRole.id);
		console.log("ロールを付与しました");
	}

	client.destroy();
});

// ログイン
console.log(process.env.DISCORD_BOT_TOKEN);
client.login(process.env.DISCORD_BOT_TOKEN);
