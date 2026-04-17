import { Router } from 'express';
import * as controller from './controller.ts';

export const accountsRouter = Router();

accountsRouter.route('/legacy').post(controller.createLegacyAccount);

accountsRouter.route('/connect/:accountName').put(controller.markAccountAsConnect);

accountsRouter.route('/type/:accountName').put(controller.updateAccountType);