import express from "express";
import { registerUser ,loginUser,getUser} from "../controllers/user.controllers.js";
import { protect } from "../middlewires/auth.js";
import { getPublishedImage } from "../controllers/message.controllers.js";

const userRouter = express.Router();

userRouter.post("/register",registerUser)
userRouter.post("/login",loginUser);
userRouter.get("/data",protect,getUser);
userRouter.get("/image/published", protect, getPublishedImage);


export default userRouter;