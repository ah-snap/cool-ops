import { Router } from 'express';
import * as controller from './controller.ts';

export const settingsRouter = Router();

settingsRouter.route('/').get(controller.listSettings);

// Must be registered before '/:key' so "export" isn't swallowed as a key param.
settingsRouter.route('/export').get(controller.exportSettings);

settingsRouter.route('/:key')
    .get(controller.getSetting)
    .put(controller.updateSetting);
