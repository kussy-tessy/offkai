import type {
  GetOffkaiDetailRequest,
  GetOffkaiDetailResponse,
  Unbrand,
} from "@offkai/core";
import { OffkaiAnswerRepository } from "../../../repository";

export async function getDetail(
  input: GetOffkaiDetailRequest,
): Promise<Unbrand<GetOffkaiDetailResponse>> {
  const result = await new OffkaiAnswerRepository().getDetail(input.id);
  return result;
}
