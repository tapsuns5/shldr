import 'dotenv/config';
import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getBullBoardQueues } from '@/lib/queue';

const PORT = process.env.QUEUE_UI_PORT ? Number(process.env.QUEUE_UI_PORT) : 3001;

const app = express();
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: getBullBoardQueues().map((queue) => new BullMQAdapter(queue)),
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

app.listen(PORT, () => {
  console.log(`[queue-ui] BullBoard running on http://localhost:${PORT}/admin/queues`);
});
