import { handle } from 'hono/cloudflare-pages';
import { app } from '../../api/app.js';

export const onRequest = handle(app);
