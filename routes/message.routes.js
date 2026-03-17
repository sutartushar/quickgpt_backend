import express from "express";
import { protect } from "../middlewires/auth.js";
import {
  imageMessageController,
  textMessageController,
} from "../controllers/message.controllers.js";

const messageRouter = express.Router();

messageRouter.post("/text", protect, textMessageController);
messageRouter.post("/image", protect, imageMessageController);

export default messageRouter;

