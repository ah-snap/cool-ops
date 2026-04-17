import { Router } from 'express';
import * as controller from './controller.ts';

export const licensesRouter = Router();

licensesRouter.route('/').post(controller.createLicense);
licensesRouter.route('/expire').post(controller.expireLicenses);
licensesRouter.route('/details/:type/:value').get(controller.getLicenseDetails);
licensesRouter.route('/details/:type/:value/revoke').post(controller.revokeLicenseDetailsTarget);
licensesRouter.route('/details/:type/:value').delete(controller.deleteLicenseDetailsTarget);
licensesRouter.route('/accounts/:accountId').get(controller.getLicensesByAccountId);
licensesRouter.route('/stripeLicenses').get(controller.retrieveBatchOfStripeLicenses);
licensesRouter.route('/snowLicenseAndTransaction').post(controller.insertSnowLicenseAndTransaction);
licensesRouter.route('/:accountName').get(controller.getLicenses);
licensesRouter.route('/:externalId/:psp').get(controller.getPotentiallyMissingPsp);
licensesRouter.route('/vendorTransactions').post(controller.insertVendorTransaction);
licensesRouter.route('/subscriptionCodes').post(controller.insertSubscriptionCode);
licensesRouter.route('/:code').put(controller.updateLicense);
