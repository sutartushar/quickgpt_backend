import db from "../config/db.config.js";

// api controller for creating new chart
async function createChat(req, res) {
  try {
    const userId = req.user.id;

    const name = "New chart";
    const userName = req.user.name;

    const [result] = await db.query(
      `INSERT INTO chats( userId , userName , name) VALUES (?,?,?)`,
      [userId, userName, name],
    );
    res.status(201).json({
      success: true,
      chatId: result.insertId,
      message: "Chat created successfully",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
}

async function getChats(req, res) {
  try {
    const userId = req.user._id;

    const [chats] = await db.query(
      `SELECT * FROM chats WHERE userId = ? ORDER BY createdAt DESC`,
      [userId]
    );

    for (const chat of chats) {
      const [messages] = await db.query(
        `SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC`,
        [chat.id]
      );
      chat.messages = messages;
    }

    return res.status(200).json({
      success: true,
      chats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function deleteChat(req, res) {
  try {
    const userId = req.user.id;

    const { chatId } = req.body;

    await db.query(`DELETE FROM chats WHERE id = ? AND userId = ?`, [
      chatId,
      userId,
    ]);

    res.status(200).json({
      success: true,
      message: "Chat deleted",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
}

export { createChat, getChats, deleteChat };
