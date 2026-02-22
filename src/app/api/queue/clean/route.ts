import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 清理执行超时卡在 RUNNING 状态的任务
export async function POST() {
    try {
        // 定义超时时间：5分钟没有更新则认为卡死
        const timeoutThreshold = new Date(Date.now() - 5 * 60 * 1000);

        // 解析任务：重置为 PENDING
        const parseRes = await prisma.scheduledParse.updateMany({
            where: { status: 'RUNNING', updatedAt: { lt: timeoutThreshold } },
            data: { status: 'PENDING' },
        });

        // 匹配任务：标记为 FAILED
        const matchRes = await prisma.scheduledMatch.updateMany({
            where: { status: 'RUNNING', updatedAt: { lt: timeoutThreshold } },
            data: { status: 'FAILED', error: '执行超时，系统自动清理' },
        });

        // AI 生成任务：标记为 FAILED
        const aigenRes = await prisma.aiGenTask.updateMany({
            where: { status: 'RUNNING', updatedAt: { lt: timeoutThreshold } },
            data: { status: 'FAILED', error: '执行超时，系统自动清理' },
        });

        const totalCleaned = parseRes.count + matchRes.count + aigenRes.count;

        return NextResponse.json({
            message: '清理成功',
            cleaned: totalCleaned,
        });
    } catch (error) {
        console.error('清理异常任务失败:', error);
        return NextResponse.json({ error: '清理异常任务失败' }, { status: 500 });
    }
}
