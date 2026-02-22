import {
  GetOffkaiDetailRequestSchema,
  type GetOffkaiDetailResponse,
} from "@offkai/core";
import type { FastifyPluginAsync } from "fastify";
import { getOffkaiDetail } from "./get-offkai-detail.usecase";

export const offkaiAnswerRoute: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.auth.requireUser);

  // GET /offkai-answer/:id
  app.get("/:id", async (request) => {
    const input = GetOffkaiDetailRequestSchema.parse(request.params);
    return getOffkaiDetail(input) as Promise<GetOffkaiDetailResponse>;
  });
};
