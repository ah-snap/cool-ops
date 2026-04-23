import { Router } from 'express';
import * as controller from './controller.ts';

export const accountsRouter = Router();

accountsRouter.route('/legacy').post(controller.createLegacyAccount);

accountsRouter.route('/connect/:accountName').put(controller.markAccountAsConnect);

// Legacy endpoint: prefer PATCH /:accountName with { accountType }
accountsRouter.route('/type/:accountName').put(controller.updateAccountType);

// RESTful partial update for an account. Body is an AccountPatch:
// { accountType?: "Connect" | "Legacy", connectTier?: ConnectTier | null }
accountsRouter.route('/:accountName').patch(controller.patchAccount);