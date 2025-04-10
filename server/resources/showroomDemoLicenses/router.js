import { Router } from 'express';
import * as controller from './controller.js';

export const showroomDemoLicenses = Router();

showroomDemoLicenses.route('/').post(controller.assignLicenses);