export interface MatchTask {
  status: 'running' | 'completed' | 'failed';
  jobPostingId: string;
  total: number;
  processed: number;
  currentCandidate: string | null;
  matches: any[];
  error: string | null;
  startedAt: number;
}

// 使用 globalThis 防止开发模式 HMR 重置内存数据
const globalForTasks = globalThis as unknown as { _matchTasks: Map<string, MatchTask> };
if (!globalForTasks._matchTasks) {
  globalForTasks._matchTasks = new Map<string, MatchTask>();
}
const tasks = globalForTasks._matchTasks;

const CLEANUP_DELAY = 30 * 60 * 1000; // 30 minutes

export function getTask(jobPostingId: string): MatchTask | undefined {
  return tasks.get(jobPostingId);
}

export function createTask(jobPostingId: string, total: number): MatchTask {
  const task: MatchTask = {
    status: 'running',
    jobPostingId,
    total,
    processed: 0,
    currentCandidate: null,
    matches: [],
    error: null,
    startedAt: Date.now(),
  };
  tasks.set(jobPostingId, task);
  return task;
}

export function updateTask(jobPostingId: string, updates: Partial<MatchTask>) {
  const task = tasks.get(jobPostingId);
  if (task) {
    Object.assign(task, updates);
  }
}

export function completeTask(jobPostingId: string, matches: any[]) {
  const task = tasks.get(jobPostingId);
  if (task) {
    task.status = 'completed';
    task.matches = matches;
    task.currentCandidate = null;
    scheduleCleanup(jobPostingId);
  }
}

export function failTask(jobPostingId: string, error: string) {
  const task = tasks.get(jobPostingId);
  if (task) {
    task.status = 'failed';
    task.error = error;
    task.currentCandidate = null;
    scheduleCleanup(jobPostingId);
  }
}

function scheduleCleanup(jobPostingId: string) {
  setTimeout(() => {
    tasks.delete(jobPostingId);
  }, CLEANUP_DELAY);
}
