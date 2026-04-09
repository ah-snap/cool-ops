import { Router } from 'express';
import * as controller from './controller.ts';

export const showroomDemoLicenses = Router();

showroomDemoLicenses.route('/').post(controller.assignLicenses);