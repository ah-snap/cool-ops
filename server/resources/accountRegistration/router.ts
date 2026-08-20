import { Router } from 'express';
import * as controller from './controller.ts';

export const accountRegistrationRouter = Router();

accountRegistrationRouter.route('/:accountId')
    .get(controller.getAccountRegistration)
    .patch(controller.patchAccountRegistration);
