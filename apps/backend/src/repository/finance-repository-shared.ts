import type { Prisma, PrismaClient } from "@prisma/client";

export type FinanceDbClient = PrismaClient | Prisma.TransactionClient;
