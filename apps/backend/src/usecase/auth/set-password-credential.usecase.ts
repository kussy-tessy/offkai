import type { GetMeResponse, Unbrand, UserId } from "@offkai/core";
import bcrypt from "bcryptjs";
import { AppError, runBusinessRule } from "../../app-error";
import { UserRepository } from "../../repository";
import { getMe } from "./get-me.usecase";

export async function setPasswordCredential(
	userId: UserId,
	loginId: string,
	password: string,
): Promise<Unbrand<GetMeResponse>> {
	const repository = new UserRepository();
	const user = await repository.findById(userId);
	if (!user) throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	if (user.passwordHash)
		throw new AppError("CONFLICT", "パスワードはすでに設定されています。");
	if (await repository.findByLoginId(loginId)) {
		throw new AppError(
			"LOGIN_ID_ALREADY_EXISTS",
			"このログインIDはすでに使用されています。",
		);
	}
	const passwordHash = await bcrypt.hash(password, 12);
	await repository.save(
		runBusinessRule(() => user.setPasswordCredential(loginId, passwordHash)),
	);
	const me = await getMe(userId);
	if (!me) throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	return me;
}
