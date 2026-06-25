import { Router } from 'express';
import { connectorsController } from './connectors.controller.js';

export const connectorsRouter = Router();

connectorsRouter.get('/', (req, res, next) => connectorsController.getConnectors(req, res, next));
connectorsRouter.get('/:id', (req, res, next) => connectorsController.getConnector(req, res, next));
connectorsRouter.put('/:id', (req, res, next) => connectorsController.updateConnector(req, res, next));
