import type { GetOffkaiDetailRequest } from "@offkai/core";
import { OffkaiAnswerRepository } from "../../repository";

export async function getOffkaiDetail(input: GetOffkaiDetailRequest) {
  const result = await new OffkaiAnswerRepository().getDetails(input.id);
  return result;
}