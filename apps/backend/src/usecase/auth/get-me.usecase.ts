import type { GetMeResponse, Unbrand, UserId } from "@offkai/core";
import { prisma } from "../../repository/prisma";

export async function getMe(
  userId: UserId,
): Promise<Unbrand<GetMeResponse> | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, loginId: true, name: true, createdAt: true },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    loginId: user.loginId,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}