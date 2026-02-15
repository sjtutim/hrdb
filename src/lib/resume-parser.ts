import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function parseResumeFile(
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (
    contentType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    contentType === 'application/msword'
  ) {
    return parseDocx(buffer);
  }
  // Default to PDF
  return parsePdf(buffer);
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const pdfData = await pdfParse(buffer);
  return convertRawTextToMarkdown(pdfData.text);
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return convertRawTextToMarkdown(result.value);
}

export function convertRawTextToMarkdown(text: string): string {
  const lines = text.split('\n');
  const mdLines: string[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    // Skip empty lines but preserve paragraph breaks
    if (line.trim() === '') {
      mdLines.push('');
      continue;
    }

    // Detect likely section headings (short lines, often all-caps or Chinese section titles)
    const trimmed = line.trim();
    if (
      trimmed.length <= 30 &&
      (isSectionHeading(trimmed))
    ) {
      mdLines.push(`## ${trimmed}`);
    } else {
      mdLines.push(trimmed);
    }
  }

  // Clean up multiple consecutive empty lines
  return mdLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isSectionHeading(text: string): boolean {
  const headingPatterns = [
    /^(个人信息|基本信息|教育背景|教育经历|工作经历|工作经验|项目经历|项目经验|技能特长|专业技能|自我评价|获奖情况|证书|培训经历|求职意向|语言能力|兴趣爱好)$/,
    /^(EDUCATION|EXPERIENCE|SKILLS|PROJECTS|AWARDS|CERTIFICATES|SUMMARY|OBJECTIVE|PROFILE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE)$/i,
  ];
  return headingPatterns.some((p) => p.test(text));
}
