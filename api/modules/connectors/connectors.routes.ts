import { Hono } from 'hono';
import { connectorsController } from './connectors.controller.js';

export const connectorsRouter = new Hono();

connectorsRouter.get('/', (c) => connectorsController.getConnectors(c));
connectorsRouter.get('/:id', (c) => connectorsController.getConnector(c));
connectorsRouter.put('/:id', (c) => connectorsController.updateConnector(c));
