import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 检查是否已存在admin用户
  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: 'admin@hrdb.com',
    },
  });

  if (!existingAdmin) {
    // 创建管理员用户
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@hrdb.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    
    console.log('管理员用户创建成功:', admin);
  } else {
    console.log('管理员用户已存在，无需创建');
  }
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });