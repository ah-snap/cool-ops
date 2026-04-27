import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Router } from 'express';
import { portForwardsRouter } from './resources/portForwards/router.ts';
import { configurePortForwardSockets } from './resources/portForwards/socket.ts';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3004;

const apiRouter = Router();
apiRouter.use('/portForwards', portForwardsRouter);

app.use('/api', apiRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'forwards' });
});

app.use(function (req, res) {
  res.status(404).json({ error: 'Not Found' });
});

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

configurePortForwardSockets(io);

httpServer.listen(PORT, () => {
  console.log(`Forwards server listening on ${PORT}`);
});
