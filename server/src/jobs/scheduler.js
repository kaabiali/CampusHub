import { schedule } from 'node-cron';
import { Ride } from '../models/Ride.js';
import { logger } from '../lib/logger.js';

const RIDE_DONE_AFTER_MS = 3 * 3600 * 1000;

export async function closePastRides(now = new Date()) {
  const { modifiedCount } = await Ride.updateMany(
    { statut: { $in: ['OUVERT', 'COMPLET'] }, dateDepart: { $lt: new Date(now.getTime() - RIDE_DONE_AFTER_MS) } },
    { statut: 'TERMINE' },
  );
  return modifiedCount;
}

const jobs = [{ name: 'close-past-rides', run: closePastRides }];

export function startScheduler() {
  for (const job of jobs) {
    // Every job is idempotent, so a missed or doubled tick only delays or repeats harmless work.
    schedule(
      '*/15 * * * *',
      async () => {
        try {
          logger.info({ job: job.name, result: await job.run() }, 'job_done');
        } catch (err) {
          logger.error({ job: job.name, err: err.message }, 'job_failed');
        }
      },
      { name: job.name, noOverlap: true, timezone: 'Africa/Tunis' },
    );
  }
}
