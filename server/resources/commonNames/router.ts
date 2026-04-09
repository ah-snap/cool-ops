import { Router } from 'express';
import * as controller from './controller.ts';

export const commonNamesRouter = Router();

commonNamesRouter.route('/simple/:commonNameOrMac').get(controller.getSimpleMappingInfo);
commonNamesRouter.route('/:commonNameOrMac').get(controller.getCommonNameInfo);