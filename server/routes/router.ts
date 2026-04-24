import { Router } from 'express';
import { licensesRouter } from '../resources/licenses/router.ts';
import { accountsRouter } from '../resources/accounts/router.ts';
import { commonNamesRouter } from '../resources/commonNames/router.ts';
import { automationAccountsRouter } from '../resources/automationAccounts/automationAccounts.router.ts';
import { showroomDemoLicenses } from '../resources/showroomDemoLicenses/router.ts';
import { adyenRouter } from '../resources/adyen/router.ts';
import { dealersRouter } from '../resources/dealers/router.ts';
import { usersRouter } from '../resources/users/router.ts';


export const router = Router();


router.use('/licenses', licensesRouter);
router.use('/commonNames', commonNamesRouter);
router.use('/automationAccounts', automationAccountsRouter);
router.use('/showroomDemoLicenses', showroomDemoLicenses);
router.use('/accounts', accountsRouter);
router.use('/adyen', adyenRouter);
router.use('/dealers', dealersRouter);
router.use('/users', usersRouter);