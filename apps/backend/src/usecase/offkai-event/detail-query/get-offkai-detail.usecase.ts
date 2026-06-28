import type {
  GetOffkaiDetailRequest,
  GetOffkaiDetailResponse,
  Unbrand,
  UserId,
} from "@offkai/core";
import { OffkaiAnswerRepository } from "../../../repository";

export async function getOffkaiDetail(
  input: GetOffkaiDetailRequest,
  userId: UserId,
): Promise<Unbrand<GetOffkaiDetailResponse>> {
  const result = await new OffkaiAnswerRepository().getOffkaiDetail(
    input.eventId,
    userId,
  );
  return result;
}
