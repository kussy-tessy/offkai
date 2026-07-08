import type { GetMeResponse, Unbrand, UserId } from "@offkai/core";
import { UserRepository, prisma } from "../../repository";

export async function getMe(
	userId: UserId,
): Promise<Unbrand<GetMeResponse> | null> {
	const [user, ownerSeriesMember] = await Promise.all([
		new UserRepository().findById(userId),
		prisma.seriesMember.findFirst({
			where: { userId, role: "owner" },
			select: { userId: true },
		}),
	]);

	if (!user) {
		return null;
	}

	return {
		id: user.id,
		loginId: user.loginId,
		name: user.name,
		discordUsername: user.discordUsername,
		createdAt: user.createdAt.toISOString(),
		isSeriesOwner: ownerSeriesMember !== null,
	};
}
