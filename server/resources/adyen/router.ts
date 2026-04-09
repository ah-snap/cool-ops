import { Router } from 'express';
import * as controller from './controller.ts';

export const adyenRouter = Router();

adyenRouter.route('/:psp').get(controller.getPspDetails);