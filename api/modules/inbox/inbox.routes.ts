import { Hono } from 'hono';
import { inboxController } from './inbox.controller.js';

export const inboxRouter = new Hono();

// Queue lists
inboxRouter.get('/pending', (c) => inboxController.getPending(c));
inboxRouter.get('/deferred', (c) => inboxController.getDeferred(c));
inboxRouter.get('/trash', (c) => inboxController.getTrash(c));

// Candidate operations
inboxRouter.get('/candidates/:id', (c) => inboxController.getCandidate(c));
inboxRouter.post('/candidates/:id/approve', (c) => inboxController.approve(c));
inboxRouter.post('/candidates/:id/defer', (c) => inboxController.defer(c));
inboxRouter.post('/candidates/:id/undefer', (c) => inboxController.undefer(c));
inboxRouter.delete('/candidates/:id', (c) => inboxController.delete(c));
inboxRouter.post('/candidates/:id/restore', (c) => inboxController.restore(c));
inboxRouter.delete('/candidates/:id/purge', (c) => inboxController.purge(c));
