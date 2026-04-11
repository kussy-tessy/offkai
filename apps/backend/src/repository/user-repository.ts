import type { UserId } from "@offkai/core";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export type CreateUserInput = {
  loginId: string;
  name: string;
  passwordHash: string;
};

export type UserProfileRecord = {
  id: string;
  loginId: string;
  name: string;
  createdAt: Date;
};

export type UserAuthRecord = {
  id: string;
  loginId: string;
  name: string;
  passwordHash: string;
};

export class UserRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async findByLoginId(loginId: string): Promise<UserAuthRecord | null> {
    return this.prisma.user.findUnique({
      where: { loginId },
      select: { id: true, loginId: true, name: true, passwordHash: true },
    });
  }

  async createUser(input: CreateUserInput): Promise<UserProfileRecord> {
    return this.prisma.user.create({
      data: {
        loginId: input.loginId,
        name: input.name,
        passwordHash: input.passwordHash,
      },
      select: { id: true, loginId: true, name: true, createdAt: true },
    });
  }

  async findById(userId: UserId): Promise<UserProfileRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, loginId: true, name: true, createdAt: true },
    });
  }
}