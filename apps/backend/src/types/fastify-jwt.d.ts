import "@fastify/jwt";
import type { UserId } from "@offkai/core";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: UserId };
    user: { userId: UserId };
  }
}
