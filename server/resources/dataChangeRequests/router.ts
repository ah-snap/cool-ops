import { Router } from "express";
import * as controller from "./controller.ts";

export const dataChangeRequestsRouter = Router();

dataChangeRequestsRouter.route("/")
    .get(controller.listRequests)
    .post(controller.createRequest);

dataChangeRequestsRouter.route("/:id")
    .get(controller.getRequestById)
    .patch(controller.updateRequestById)
    .delete(controller.deleteRequestById);
