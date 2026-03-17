import bcrypt from "bcrypt";
import db from "../config/db.config.js";
import jwt from "jsonwebtoken";

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "3d" });
}

async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [existingUser] = await db.query(
      `SELECT * FROM users WHERE email = ?`,
      [email],
    );

    if (existingUser.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "User already exist" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users(name,email,password) VALUES (?,?,?)`,
      [name, email, hashedPassword],
    );

    const token = generateToken(result.insertId);

    res
      .status(201)
      .json({ success: true, token, message: "User registration successful" });
  } catch (error) {
    res.status(500).json({
      message: `Server error: ${error.message}`,
    });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const [users] = await db.query(`SELECT * FROM users WHERE email = ?`, [
      email,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: `Server error: ${error.message}`,
    });
  }
}

async function getUser(req, res) {
  try {
    const user = req.user;
    return res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({
      message: `Server error: ${error.message}`,
    });
  }
}

export { registerUser, loginUser, getUser };
