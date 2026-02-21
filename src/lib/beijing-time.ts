export const BEIJING_TIME_ZONE = 'Asia/Shanghai';

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 计算“下一个北京时间 HH:mm”对应的绝对时间（UTC Date）。
 * 与服务器所在时区无关，始终按北京时间计算。
 */
export function getNextBeijingTime(hour: number, minute = 0): Date {
  if (hour < 0 || hour > 23) throw new Error(`hour out of range: ${hour}`);
  if (minute < 0 || minute > 59) throw new Error(`minute out of range: ${minute}`);

  const nowUtcMs = Date.now();
  const nowBeijingMs = nowUtcMs + BEIJING_OFFSET_MS;
  const nowBeijing = new Date(nowBeijingMs);

  let targetBeijingMs = Date.UTC(
    nowBeijing.getUTCFullYear(),
    nowBeijing.getUTCMonth(),
    nowBeijing.getUTCDate(),
    hour,
    minute,
    0,
    0
  );

  if (targetBeijingMs <= nowBeijingMs) {
    targetBeijingMs += ONE_DAY_MS;
  }

  return new Date(targetBeijingMs - BEIJING_OFFSET_MS);
}

export function formatBeijingDateTime(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale = 'zh-CN'
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(locale, {
    timeZone: BEIJING_TIME_ZONE,
    ...options,
  });
}
