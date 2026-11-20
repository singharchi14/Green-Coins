import { PrismaClient } from '@prisma/client';
// Reuse one client across Next.js dev hot-reloads (otherwise Neon runs out of connections).
const g = globalThis;
export const prisma = g.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.__prisma = prisma;
