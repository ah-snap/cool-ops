import { Router } from "express";
import {
  getAwsCredentialsFreshness,
  getPortForwardLogs,
  listPortForwards,
  restartPortForward,
  startPortForward,
  stopPortForward
} from "./controller.ts";

export const portForwardsRouter = Router();

portForwardsRouter.get("/", listPortForwards);
portForwardsRouter.get("/aws-credentials/freshness", getAwsCredentialsFreshness);
portForwardsRouter.get("/:id/logs", getPortForwardLogs);
portForwardsRouter.post("/:id/start", startPortForward);
portForwardsRouter.post("/:id/restart", restartPortForward);
portForwardsRouter.post("/:id/stop", stopPortForward);
