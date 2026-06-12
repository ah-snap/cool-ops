import { Router } from "express";
import * as controller from "./controller.js";

export const testUserRouter = Router();

testUserRouter.route("/user/:userId").get(controller.getUserById);
testUserRouter.route("/owner/:accountId").get(controller.getOwnerByAccountId);
testUserRouter.route("/activate").post(controller.activate);
testUserRouter.route("/deactivate").post(controller.deactivate);
