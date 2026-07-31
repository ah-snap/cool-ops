import { Router } from "express";
import { getAwsProfileDiscovery } from "./controller.ts";

export const awsProfileDiscoveryRouter = Router();

awsProfileDiscoveryRouter.get("/", getAwsProfileDiscovery);
