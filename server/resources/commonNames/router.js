import { Router } from 'express';
import * as controller from './controller.js';

export const commonNamesRouter = Router();

commonNamesRouter.route('/:commonNameOrMac').get(controller.getCommonNameInfo);