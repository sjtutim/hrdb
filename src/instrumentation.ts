export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initScheduler } = await import('./lib/match-scheduler');
    initScheduler();
    const { initParseScheduler } = await import('./lib/parse-scheduler');
    initParseScheduler();
    const { initAiGenScheduler } = await import('./lib/ai-gen-scheduler');
    initAiGenScheduler();
  }
}
