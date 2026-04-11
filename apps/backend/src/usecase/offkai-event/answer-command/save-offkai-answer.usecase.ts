import type {
  SaveOffkaiAnswerRequest,
  SaveOffkaiAnswerResponse,
  Unbrand,
  UserId,
} from "@offkai/core";
import { OffkaiAnswerRepository } from "../../../repository";
import { OffkaiAnswerService } from "../../../service/offkai-answer.service";

export async function saveOffkaiAnswer(
  input: SaveOffkaiAnswerRequest,
  userId: UserId,
): Promise<Unbrand<SaveOffkaiAnswerResponse>> {
  const service = new OffkaiAnswerService();
  const answer = await service.prepareAnswerEntity(
    input.eventId,
    userId,
    input.commitmentAnswers,
    input.preferenceAnswers,
  );

  const repository = new OffkaiAnswerRepository();
  await repository.save(answer);

  return { ok: true };
}
