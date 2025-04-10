import { Router } from 'express';
import * as controller from './automationAccounts.controller.js';

export const automationAccountsRouter = Router();

automationAccountsRouter.route('/').get(controller.getAutomationAccountsByCommonName);