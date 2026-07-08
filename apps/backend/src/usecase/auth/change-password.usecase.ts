import type { UserId } from "@offkai/core";
import bcrypt from "bcryptjs";
import { AppError, runBusinessRule } from "../../app-error";
import { UserRepository } from "../../repository";

export async function changePassword(
	userId: UserId,
	currentPassword: string,
	newPassword: string,
): Promise<void> {
	const repository = new UserRepository();
	const user = await repository.findById(userId);

	if (!user) {
		throw new AppError("UNAUTHORIZED", "ログインが必要です。");
	}

	const ok = await bcrypt.compare(currentPassword, user.passwordHash);
	if (!ok) {
		throw new AppError(
			"INVALID_CREDENTIALS",
			"現在のパスワードが正しくありません。",
		);
	}

	const passwordHash = await bcrypt.hash(newPassword, 12);
	await repository.save(
		runBusinessRule(() => user.changePasswordHash(passwordHash)),
	);
}
