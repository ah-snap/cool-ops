import { Router } from 'express';
import * as controller from './automationAccounts.controller.ts';

export const automationAccountsRouter = Router();

automationAccountsRouter.route('/').get(controller.getAutomationAccountsByCommonName);
automationAccountsRouter.route('/excludeAssist/:locationId').post(controller.updateExcludeAssist);