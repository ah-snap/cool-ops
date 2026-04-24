import { Router } from "express";
import * as controller from "./controller.js";

export const usersRouter = Router();

usersRouter.route("/:emailOrMac").get(controller.lookupUsers);
