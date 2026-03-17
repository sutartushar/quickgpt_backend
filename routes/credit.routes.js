import express from "express";
import { protect } from "../middlewires/auth.js";
import { getPlans, purchasePlan } from "../controllers/credit.controllers.js";

const creditRouter = express.Router();

creditRouter.get("/plans", getPlans);
creditRouter.post("/purchase", protect, purchasePlan);

export default creditRouter;

