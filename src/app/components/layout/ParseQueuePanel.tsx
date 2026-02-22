'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Layers,
  Play,
  Trash2,
  FileText,
  Sparkles,
  X,
  RefreshCw,
  Eraser,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { formatBeijingDateTime } from '@/lib/beijing-time';

// ────────────────────────────────────────────────
// 类型定义
// ────────────────────────────────────────────────

interface ParseTask {
  id: string;
  originalName: string;
  status: 'PENDING' | 'RUNNING';
  scheduledFor: string;
  createdAt: string;
}

interface MatchTask {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'FAILED';
  scheduledFor: string;
  totalCandidates: number;
  processedCount: number;
  error: string | null;
  jobPosting: { title: string; department: string };
}

interface AiGenTask {
  id: string;
  title: string;
  department: string;
  status: 'PENDING' | 'RUNNING' | 'FAILED';
  error: string | null;
  createdAt: string;
}

type Tab = 'parse' | 'match' | 'aigen';

const POLL_INTERVAL = 30_000;

// ────────────────────────────────────────────────
// 主组件
// ────────────────────────────────────────────────

export function QueuePanel() {
  const [parseTasks, setParseTasks] = useState<ParseTask[]>([]);
  const [matchTasks, setMatchTasks] = useState<MatchTask[]>([]);
  const [aiGenTasks, setAiGenTasks] = useState<AiGenTask[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('parse');
  const [loading, setLoading] = useState(false);
  const [parseAction, setParseAction] = useState<Record<string, 'run' | 'delete' | null>>({});
  const [matchAction, setMatchAction] = useState<Record<string, 'run' | 'cancel' | null>>({});
  const [aiGenAction, setAiGenAction] = useState<Record<string, 'retry' | 'delete' | null>>({});

  const handleCleanTimeout = useCallback(async () => {
    try {
      const res = await fetch('/api/queue/clean', { method: 'POST' });
      if (res.ok) {
        await fetchQueue();
      }
    } catch {
      /* silent */
    }
  }, [fetchQueue]);

  // ── 数据获取 ──────────────────────────────────

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [parseRes, matchRes, aiGenRes] = await Promise.all([
        fetch('/api/resume/parse-queue'),
        fetch('/api/scheduled-matches?status=PENDING&status=RUNNING'),
        fetch('/api/ai/gen-tasks'),
      ]);
      if (parseRes.ok) {
        const d = await parseRes.json();
        setParseTasks(d.tasks ?? []);
      }
      if (matchRes.ok) {
        const d: MatchTask[] = await matchRes.json();
        setMatchTasks(d.filter((t) => ['PENDING', 'RUNNING', 'FAILED'].includes(t.status)));
      }
      if (aiGenRes.ok) {
        const d = await aiGenRes.json();
        setAiGenTasks(d.tasks ?? []);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const timer = setInterval(fetchQueue, POLL_INTERVAL);
    window.addEventListener('queue:updated', fetchQueue);
    return () => {
      clearInterval(timer);
      window.removeEventListener('queue:updated', fetchQueue);
    };
  }, [fetchQueue]);

  // ── 解析队列操作 ──────────────────────────────

  const handleParseRun = useCallback(
    async (id: string) => {
      setParseAction((p) => ({ ...p, [id]: 'run' }));
      try {
        const res = await fetch(`/api/resume/parse-queue/${id}`, { method: 'POST' });
        if (res.ok) await fetchQueue();
      } catch {
        /* silent */
      } finally {
        setParseAction((p) => ({ ...p, [id]: null }));
      }
    },
    [fetchQueue]
  );

  const handleParseDelete = useCallback(async (id: string) => {
    setParseAction((p) => ({ ...p, [id]: 'delete' }));
    try {
      const res = await fetch(`/api/resume/parse-queue/${id}`, { method: 'DELETE' });
      if (res.ok) setParseTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      /* silent */
    } finally {
      setParseAction((p) => ({ ...p, [id]: null }));
    }
  }, []);

  // ── AI 生成队列操作 ────────────────────────────

  const handleAiGenRetry = useCallback(
    async (id: string) => {
      setAiGenAction((p) => ({ ...p, [id]: 'retry' }));
      try {
        const res = await fetch(`/api/ai/gen-tasks/${id}`, { method: 'POST' });
        if (res.ok) {
          // SSE 流：读完后刷新列表
          const reader = res.body?.getReader();
          if (reader) {
            while (true) {
              const { done } = await reader.read();
              if (done) break;
            }
          }
          await fetchQueue();
        }
      } catch {
        /* silent */
      } finally {
        setAiGenAction((p) => ({ ...p, [id]: null }));
      }
    },
    [fetchQueue]
  );

  const handleAiGenDelete = useCallback(async (id: string) => {
    setAiGenAction((p) => ({ ...p, [id]: 'delete' }));
    try {
      const res = await fetch(`/api/ai/gen-tasks/${id}`, { method: 'DELETE' });
      if (res.ok) setAiGenTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      /* silent */
    } finally {
      setAiGenAction((p) => ({ ...p, [id]: null }));
    }
  }, []);

  // ── 匹配队列操作 ──────────────────────────────

  const handleMatchRun = useCallback(
    async (id: string) => {
      setMatchAction((p) => ({ ...p, [id]: 'run' }));
      try {
        const res = await fetch(`/api/scheduled-matches/${id}/run`, { method: 'POST' });
        if (res.ok) await fetchQueue();
      } catch {
        /* silent */
      } finally {
        setMatchAction((p) => ({ ...p, [id]: null }));
      }
    },
    [fetchQueue]
  );

  const handleMatchCancel = useCallback(async (id: string) => {
    setMatchAction((p) => ({ ...p, [id]: 'cancel' }));
    try {
      const res = await fetch(`/api/scheduled-matches/${id}`, { method: 'DELETE' });
      if (res.ok) setMatchTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      /* silent */
    } finally {
      setMatchAction((p) => ({ ...p, [id]: null }));
    }
  }, []);

  // ── 统计 ─────────────────────────────────────

  const totalCount = parseTasks.length + matchTasks.length + aiGenTasks.length;
  if (totalCount === 0) return null;

  const parseRunning = parseTasks.filter((t) => t.status === 'RUNNING').length;
  const matchRunning = matchTasks.filter((t) => t.status === 'RUNNING').length;
  const aiGenRunning = aiGenTasks.filter((t) => t.status === 'RUNNING').length;
  const anyRunning = parseRunning + matchRunning + aiGenRunning > 0;

  // ── 工具函数 ──────────────────────────────────

  function fmtTime(iso: string) {
    return formatBeijingDateTime(iso, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ── 渲染 ──────────────────────────────────────

  return (
    <div className="relative">
      {/* 触发按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-1.5 h-9 px-2.5 text-white/80 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 rounded-lg transition-all"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : anyRunning ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
        ) : (
          <Layers className="h-4 w-4" />
        )}
        <span className="hidden sm:inline text-sm">队列管理</span>
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
          {totalCount}
        </span>
        {open ? (
          <ChevronUp className="h-3 w-3 text-white/50 hidden sm:inline" />
        ) : (
          <ChevronDown className="h-3 w-3 text-white/50 hidden sm:inline" />
        )}
      </Button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[26rem] bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-150">
          {/* 面板头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold">队列管理</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="一键清理超时卡死任务 (>5分钟)"
                onClick={handleCleanTimeout}
              >
                <Eraser className="h-3.5 w-3.5 text-orange-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border bg-muted/20">
            <TabButton
              active={tab === 'parse'}
              onClick={() => setTab('parse')}
              icon={<FileText className="h-3.5 w-3.5" />}
              label="简历解析"
              count={parseTasks.length}
              runningCount={parseRunning}
            />
            <TabButton
              active={tab === 'match'}
              onClick={() => setTab('match')}
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="智能匹配"
              count={matchTasks.length}
              runningCount={matchRunning}
            />
            <TabButton
              active={tab === 'aigen'}
              onClick={() => setTab('aigen')}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              label="AI生成"
              count={aiGenTasks.length}
              runningCount={aiGenRunning}
            />
          </div>

          {/* 任务列表 */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {tab === 'parse' && (
              <>
                {parseTasks.length === 0 && <EmptyState />}
                {parseTasks.map((task) => {
                  const acting = !!parseAction[task.id];
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                        task.status === 'RUNNING' && 'bg-blue-50/50 dark:bg-blue-950/10'
                      )}
                    >
                      <div className="shrink-0">
                        {task.status === 'RUNNING' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-foreground">{task.originalName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {task.status === 'RUNNING'
                            ? '正在解析...'
                            : `计划于 ${fmtTime(task.scheduledFor)}`}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {task.status === 'RUNNING' && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-blue-500 mr-1">解析中</Badge>
                        )}
                        {task.status === 'PENDING' && (
                          <ActionButton
                            icon={<Play className="h-3.5 w-3.5" />}
                            loading={parseAction[task.id] === 'run'}
                            disabled={acting}
                            title="立即执行"
                            onClick={() => handleParseRun(task.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                          />
                        )}
                        <ActionButton
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          loading={parseAction[task.id] === 'delete'}
                          disabled={acting}
                          title={task.status === 'RUNNING' ? "强制删除" : "删除任务"}
                          onClick={() => handleParseDelete(task.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {tab === 'match' && (
              <>
                {matchTasks.length === 0 && <EmptyState />}
                {matchTasks.map((task) => {
                  const acting = !!matchAction[task.id];
                  const progress =
                    task.totalCandidates > 0
                      ? Math.round((task.processedCount / task.totalCandidates) * 100)
                      : 0;
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 text-sm transition-colors',
                        task.status === 'RUNNING' && 'bg-blue-50/50 dark:bg-blue-950/10',
                        task.status === 'FAILED' && 'bg-red-50/50 dark:bg-red-950/10'
                      )}
                    >
                      <div className="shrink-0 mt-0.5">
                        {task.status === 'RUNNING' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : task.status === 'FAILED' ? (
                          <X className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-foreground">
                          {task.jobPosting.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {task.jobPosting.department}
                        </p>

                        {task.status === 'RUNNING' && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span>匹配中...</span>
                              <span>
                                {task.processedCount}/{task.totalCandidates}
                              </span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {task.status === 'FAILED' && (
                          <p className="text-[10px] text-red-500 mt-1 truncate">
                            失败: {task.error || '未知错误'}
                          </p>
                        )}

                        {task.status === 'PENDING' && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {task.totalCandidates} 位候选人 · 计划于 {fmtTime(task.scheduledFor)}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1 mt-0.5">
                        {task.status === 'PENDING' && (
                          <ActionButton
                            icon={<Play className="h-3.5 w-3.5" />}
                            loading={matchAction[task.id] === 'run'}
                            disabled={acting}
                            title="立即执行"
                            onClick={() => handleMatchRun(task.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                          />
                        )}
                        {task.status === 'RUNNING' && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-blue-500 mr-1">匹配中</Badge>
                        )}
                        {task.status === 'FAILED' && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mr-1">失败</Badge>
                        )}
                        <ActionButton
                          icon={<X className="h-3.5 w-3.5" />}
                          loading={matchAction[task.id] === 'cancel'}
                          disabled={acting}
                          title={task.status === 'RUNNING' ? '强制取消' : '取消/删除'}
                          onClick={() => handleMatchCancel(task.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {tab === 'aigen' && (
              <>
                {aiGenTasks.length === 0 && <EmptyState />}
                {aiGenTasks.map((task) => {
                  const acting = !!aiGenAction[task.id];
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 text-sm transition-colors',
                        task.status === 'RUNNING' && 'bg-blue-50/50 dark:bg-blue-950/10',
                        task.status === 'FAILED' && 'bg-red-50/50 dark:bg-red-950/10'
                      )}
                    >
                      <div className="shrink-0 mt-0.5">
                        {task.status === 'RUNNING' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : task.status === 'FAILED' ? (
                          <X className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-foreground">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {task.department}
                        </p>
                        {task.status === 'RUNNING' && (
                          <p className="text-xs text-blue-500 mt-0.5">AI 正在生成中...</p>
                        )}
                        {task.status === 'FAILED' && (
                          <p className="text-[10px] text-red-500 mt-1 truncate">
                            失败: {task.error || '未知错误'}
                          </p>
                        )}
                        {task.status === 'PENDING' && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            创建于 {fmtTime(task.createdAt)}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1 mt-0.5">
                        {task.status === 'FAILED' && (
                          <ActionButton
                            icon={<RefreshCw className="h-3.5 w-3.5" />}
                            loading={aiGenAction[task.id] === 'retry'}
                            disabled={acting}
                            title="重试"
                            onClick={() => handleAiGenRetry(task.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                          />
                        )}
                        {task.status === 'RUNNING' && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-blue-500 mr-1">生成中</Badge>
                        )}
                        <ActionButton
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          loading={aiGenAction[task.id] === 'delete'}
                          disabled={acting}
                          title={task.status === 'RUNNING' ? '强制删除' : '删除任务'}
                          onClick={() => handleAiGenDelete(task.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* 底部提示 */}
          <div className="px-4 py-2.5 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              {tab === 'parse'
                ? '解析中任务离开页面后仍将继续'
                : tab === 'match'
                  ? '凌晨 2:00 自动匹配'
                  : '失败任务可重试，生成完成后可在职位页面查看'}{' '}
              · 每 30 秒刷新
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// 向后兼容导出（Navbar 当前导入的是 ParseQueuePanel）
export { QueuePanel as ParseQueuePanel };

// ────────────────────────────────────────────────
// 子组件
// ────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  runningCount,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  runningCount: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
        active
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {runningCount > 0 ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
      {label}
      {count > 0 && (
        <span
          className={cn(
            'min-w-[16px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center px-1',
            active ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ActionButton({
  icon,
  loading,
  disabled,
  title,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  loading: boolean;
  disabled: boolean;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn('h-7 w-7', className)}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
    </Button>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
      暂无任务
    </div>
  );
}
