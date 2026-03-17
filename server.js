import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./config/db.config.js";
import userRouter from "./routes/user.routes.js";
import chatRouter from "./routes/chat.routes.js";
import messageRouter from "./routes/message.routes.js";
import creditRouter from "./routes/credit.routes.js";
import { stripeWebHooks } from "./controllers/webhook.controllers.js";
const app = express();
const port = process.env.PORT || 3000;

// Stripe webhook must receive raw body for signature verification
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebHooks);
// Backward-compatible alias (if you already configured Stripe to call this)
app.post("/api/strip", express.raw({ type: "application/json" }), stripeWebHooks);
app.use(cors());
app.use(express.json());

app.use("/api/user",userRouter);
app.use("/api/chat",chatRouter)
app.use("/api/message", messageRouter);
app.use("/api/credit", creditRouter);

pool
  .query("SELECT 1")
  .then(() => {
    console.log("Database connected successfully");
    // Start server
    app.listen(port, "0.0.0.0",() => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });
