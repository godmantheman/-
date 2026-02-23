import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const db = new Database("diabetes_app.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    age INTEGER,
    condition TEXT
  );

  CREATE TABLE IF NOT EXISTS food_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT,
    food_name TEXT,
    analysis TEXT,
    is_safe BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  const PORT = 3000;

  // API Routes
  app.get("/api/profile", (req, res) => {
    const profile = db.prepare("SELECT * FROM user_profile WHERE id = 1").get();
    res.json(profile || {});
  });

  app.post("/api/profile", (req, res) => {
    const { age, condition } = req.body;
    db.prepare(`
      INSERT INTO user_profile (id, age, condition)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET age = excluded.age, condition = excluded.condition
    `).run(age, condition);
    res.json({ success: true });
  });

  app.get("/api/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM food_logs ORDER BY created_at DESC LIMIT 50").all();
    res.json(logs);
  });

  app.post("/api/logs", (req, res) => {
    const { image_url, food_name, analysis, is_safe } = req.body;
    db.prepare(`
      INSERT INTO food_logs (image_url, food_name, analysis, is_safe)
      VALUES (?, ?, ?, ?)
    `).run(image_url, food_name, analysis, is_safe ? 1 : 0);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
