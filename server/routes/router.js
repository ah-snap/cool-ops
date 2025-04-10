import { Router } from 'express';
import { licensesRouter } from '../resources/licenses/router.js';
import { commonNamesRouter } from '../resources/commonNames/router.js';
import { automationAccountsRouter } from '../resources/automationAccounts/automationAccounts.router.js';
import { showroomDemoLicenses } from '../resources/showroomDemoLicenses/router.js';


export const router = Router();


router.use('/licenses', licensesRouter);
router.use('/commonNames', commonNamesRouter);
router.use('/automationAccounts', automationAccountsRouter);
router.use('/showroomDemoLicenses', showroomDemoLicenses);