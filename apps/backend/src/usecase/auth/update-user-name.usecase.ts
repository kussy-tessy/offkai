import type { GetMeResponse, Unbrand, UserId } from "@offkai/core";
import { AppError, runBusinessRule } from "../../app-error";
import { UserRepository } from "../../repository";
import { getMe } from "./get-me.usecase";

export async function updateUserName(
	userId: UserId,
	name: string,
): Promise<Unbrand<GetMeResponse>> {
	const repository = new UserRepository();
	const user = await repository.findById(userId);

	if (!user) {
		throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	}

	await repository.save(runBusinessRule(() => user.changeName(name)));

	const me = await getMe(userId);
	if (!me) {
		throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	}

	return me;
}
