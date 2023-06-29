import { CronJob } from 'cron';
import scriptMain from './index';

const cronTime = process.env.CRON_TIME || '0 0 * * 1-5';

const job = new CronJob(
  cronTime,
  () => {
    console.log('Running cron job');
    scriptMain();
  },
  null,
  true,
  'America/Los_Angeles'
);

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  job.stop();
  process.exit(0);
});
