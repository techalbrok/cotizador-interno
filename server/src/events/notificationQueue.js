import PQueue from 'p-queue';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class NotificationQueue {
  constructor(options = {}) {
    this.queue = new PQueue({
      concurrency: options.concurrency ?? 3,
      timeout: options.timeoutMs ?? 60_000,
      throwOnTimeout: false,
    });
  }

  enqueue(jobName, jobFn) {
    return this.queue.add(async () => {
      let lastError;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
        try {
          const result = await jobFn();
          if (attempt > 1) {
            console.log(`[notificationQueue] ${jobName} OK en intento ${attempt}`);
          }
          return result;
        } catch (error) {
          lastError = error;
          console.error(`[notificationQueue] ${jobName} fallo intento ${attempt}/${MAX_RETRIES}:`, error.message);
          if (attempt < MAX_RETRIES) {
            const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
            await sleep(backoff);
          }
        }
      }
      console.error(`[notificationQueue] ${jobName} agoto reintentos.`, lastError);
      throw lastError;
    });
  }

  get size() {
    return this.queue.size;
  }

  get pending() {
    return this.queue.pending;
  }

  async onIdle() {
    return this.queue.onIdle();
  }
}

export const notificationQueue = new NotificationQueue({
  concurrency: Number(process.env.EMAIL_CONCURRENCY) || 3,
  timeoutMs: Number(process.env.EMAIL_TIMEOUT_MS) || 60_000,
});
