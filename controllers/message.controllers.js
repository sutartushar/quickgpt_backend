import db from "../config/db.config.js";
import ai from "../config/gemini.config.js";
import axios from "axios";
import imagekit from "../config/imagekit.config.js";

async function textMessageController(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.credits < 1) {
      return res.json({
        success: false,
        message: "You don't have enough credit",
      });
    }

    const { chatId, prompt } = req.body;

    if (!chatId || !prompt) {
      return res.status(400).json({
        success: false,
        message: "chatId and prompt are required",
      });
    }

    const [chat] = await db.query(
      `SELECT * FROM chats WHERE id = ? AND userId = ?`,
      [chatId, userId],
    );

    if (chat.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    await db.query(
      `INSERT INTO messages (chatId, isImage, isPublished, role, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
      [chatId, false, true, "user", prompt, Date.now()],
    );

    const [messages] = await db.query(
      `SELECT role, content FROM messages WHERE chatId = ? ORDER BY timestamp ASC`,
      [chatId],
    );

    const geminiMessages = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: geminiMessages,
      config: {
        systemInstruction: "You are a helpful assistant.",
      },
    });

    const replyText = response.text;

    await db.query(
      `INSERT INTO messages (chatId, isImage, isPublished, role, content, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [chatId, false, true, "assistant", replyText, Date.now()],
    );

    await db.query(`UPDATE users SET credits = credits - 1 WHERE _id = ?`, [
      userId,
    ]);

    res.status(201).json({
      success: true,
      reply: {
        role: "assistant",
        content: replyText,
        timestamp: Date.now(),
        isImage: false,
      },
      creditsLeft: (req.user.credits ?? 0) - 1,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function imageMessageController(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.credits < 2) {
      return res.json({
        success: false,
        message: "You don't have enough credit",
      });
    }

    const { chatId, prompt, isPublished = false } = req.body;

    const [chat] = await db.query(
      `SELECT * FROM chats WHERE id = ? AND userId = ?`,
      [chatId, userId],
    );

    if (chat.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    await db.query(
      `INSERT INTO messages (chatId, isImage, isPublished, role, content, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [chatId, false, isPublished, "user", prompt, Date.now()],
    );

    const encodedPrompt = encodeURIComponent(prompt);

    const generateImageURL = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/quickqpt/${Date.now()}.png?tr=w-800,h-800`;

    const aiImageResponse = await axios.get(generateImageURL, {
      responseType: "arraybuffer",
    });

    const base64Image = Buffer.from(aiImageResponse.data).toString("base64");

    const uploadedResponse = await imagekit.upload({
      file: `data:image/png;base64,${base64Image}`,
      fileName: `${Date.now()}.png`,
      folder: "quickgpt",
    });

    // Persist the generated image as an assistant message
    await db.query(
      `INSERT INTO messages (chatId, isImage, isPublished, role, content, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        chatId,
        true,
        isPublished,
        "assistant",
        uploadedResponse.url,
        Date.now(),
      ],
    );

    await db.query(`UPDATE users SET credits = credits - 2 WHERE _id = ?`, [
      userId,
    ]);

    res.status(201).json({
      success: true,
      reply: {
        role: "assistant",
        content: uploadedResponse.url,
        timestamp: Date.now(),
        isImage: true,
        isPublished,
      },
      creditsLeft: (req.user.credits ?? 0) - 2,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function getPublishedImage(req, res) {
  try {
    const userId = req.user.id;

    const [images] = await db.query(
      `SELECT m.*
       FROM messages m
       JOIN chats c ON m.chatId = c.id
       WHERE c.userId = ? AND m.isImage = 1 AND m.isPublished = 1
       ORDER BY m.timestamp DESC`,
      [userId],
    );

    return res.status(200).json({
      success: true,
      images,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export { textMessageController, imageMessageController, getPublishedImage };
