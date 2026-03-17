import jwt from "jsonwebtoken";
import db from "../config/db.config.js";

export async function protect(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const [user] = await db.query(
      `SELECT _id AS id, name, email, credits FROM users WHERE _id = ?`,
      [userId],
    );

    if (user.length === 0) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = user[0];

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
      error: error.message,
    });
  }
}
