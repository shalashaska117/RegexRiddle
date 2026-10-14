// Shares one Prisma database client across the backend services.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
