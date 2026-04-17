import { Router } from "express";
import * as controller from "./controller.js";

export const dealersRouter = Router();

dealersRouter.route("/:dCode").get(controller.getDealerByDCode);
dealersRouter.route("/:dCode/freeConnectLicenses").put(controller.updateFreeConnectLicenses);
