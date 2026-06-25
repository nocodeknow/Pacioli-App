import { Router } from 'express';
import { inboxController } from './inbox.controller.js';

export const inboxRouter = Router();

// Queue lists
inboxRouter.get('/pending', (req, res, next) => inboxController.getPending(req, res, next));
inboxRouter.get('/deferred', (req, res, next) => inboxController.getDeferred(req, res, next));
inboxRouter.get('/trash', (req, res, next) => inboxController.getTrash(req, res, next));

// Candidate operations
inboxRouter.get('/candidates/:id', (req, res, next) => inboxController.getCandidate(req, res, next));
inboxRouter.post('/candidates/:id/approve', (req, res, next) => inboxController.approve(req, res, next));
inboxRouter.post('/candidates/:id/defer', (req, res, next) => inboxController.defer(req, res, next));
inboxRouter.post('/candidates/:id/undefer', (req, res, next) => inboxController.undefer(req, res, next));
inboxRouter.delete('/candidates/:id', (req, res, next) => inboxController.delete(req, res, next));
inboxRouter.post('/candidates/:id/restore', (req, res, next) => inboxController.restore(req, res, next));
inboxRouter.delete('/candidates/:id/purge', (req, res, next) => inboxController.purge(req, res, next));
