import { Router } from 'express';
import * as controller from './controller.ts';

export const router = Router();

router.route('/assistWhiteLabel').post(controller.createWhiteLabelRequest);

router.route('/').get(controller.listRequests);
router.route('/:id')
    .get(controller.getRequestById)
    .patch(controller.updateRequestById)
    .delete(controller.deleteRequestById);
