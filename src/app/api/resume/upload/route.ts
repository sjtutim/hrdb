import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// 处理简历上传
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: '只支持PDF格式的文件' },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const fileId = uuidv4();
    const fileName = `${fileId}.pdf`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 确保上传目录存在
    const uploadDir = join(process.cwd(), 'uploads');
    
    try {
      // 写入文件
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      
      // 返回文件ID，用于后续处理
      return NextResponse.json({ 
        fileId,
        message: '文件上传成功' 
      });
    } catch (error) {
      console.error('文件写入错误:', error);
      return NextResponse.json(
        { error: '文件保存失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('上传处理错误:', error);
    return NextResponse.json(
      { error: '文件上传处理失败' },
      { status: 500 }
    );
  }
}
