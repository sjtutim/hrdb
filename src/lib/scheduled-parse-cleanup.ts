import { PrismaClient } from '@prisma/client';

export const SCHEDULED_PARSE_STUCK_TIMEOUT_MS = 30 * 60 * 1000; // 30分钟

export async function cleanupStuckScheduledParses(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<number> {
  const stuckBefore = new Date(now.getTime() - SCHEDULED_PARSE_STUCK_TIMEOUT_MS);
  const result = await prisma.scheduledParse.updateMany({
    where: {
      status: 'RUNNING',
      updatedAt: { lte: stuckBefore },
    },
    data: {
      status: 'PENDING',
      error: '任务执行超时，已自动重置为待处理，请重试',
    },
  });
  return result.count;
}
