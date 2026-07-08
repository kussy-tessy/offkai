import type {
	CreateKigurumiRequest,
	KigurumiListResponse,
	KigurumiResponse,
	KigurumiRouteParams,
	Unbrand,
	UserId,
} from "@offkai/core";
import { KigurumiRepository } from "../../repository";

export async function getMyKigurumis(
	userId: UserId,
): Promise<Unbrand<KigurumiListResponse>> {
	return new KigurumiRepository().findManyByOwnerUserId(userId);
}

export async function createKigurumi(
	input: CreateKigurumiRequest,
	userId: UserId,
): Promise<Unbrand<KigurumiResponse>> {
	return new KigurumiRepository().create(input, userId);
}

export async function deleteKigurumi(
	input: KigurumiRouteParams,
	userId: UserId,
): Promise<void> {
	await new KigurumiRepository().delete(input.kigurumiId, userId);
}
