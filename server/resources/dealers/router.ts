import { Router } from "express";
import * as controller from "./controller.js";

export const dealersRouter = Router();

dealersRouter.route("/").get(controller.getDealerByDCodeOrEmail);
dealersRouter.route("/:dCode/freeConnectLicenses").put(controller.updateFreeConnectLicenses);
