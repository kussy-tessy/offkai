import type {
  GetOffkaiDetailRequest,
  GetOffkaiDetailResponse,
  Unbrand,
} from "@offkai/core";
import { OffkaiAnswerRepository } from "../../../repository";

export async function getOffkaiDetail(
  input: GetOffkaiDetailRequest,
): Promise<Unbrand<GetOffkaiDetailResponse>> {
  const result = await new OffkaiAnswerRepository().getOffkaiDetail(input.eventId);
  return result;
}
