import { Router } from 'express';
import * as controller from './licenses.controller.js';

export const licensesRouter = Router();

licensesRouter.route('/').post(controller.createLicense);
licensesRouter.route('/:accountName').get(controller.getLicenses);