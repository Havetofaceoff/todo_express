const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./todo.db");

app.get("/tasks", (req, res) => {
  const sql = `
    SELECT 
    tasks.id,
    tasks.title,
    tasks.description,
    tasks.is_completed,
    categories.name AS category_name,
    tasks.created_at
FROM tasks
LEFT JOIN categories ON tasks.category_id = categories.id
ORDER BY tasks.id DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post("/tasks", (req, res) => {
  const { title, description, category_id } = req.body;
  const sql = `
    INSERT INTO tasks (title, description, is_completed, category_id)
VALUES (?, ?, 0, ?);`;

  db.run(sql, [title, description, category_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      id: this.lastID,
      title,
      description,
      is_completed: 0,
      category_id,
    });
  });
});

app.put("/tasks/:id", (req, res) => {
  const { id } = req.params;
  const { title, description, category_id } = req.body;
  const sql = `
    UPDATE tasks
SET title = ?, description = ?, category_id = ?
WHERE id = ?`;

  db.run(sql, [title, description, category_id, id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: "Дело обновлено",
    });
  });
});

app.patch("/tasks/:id/complete", (req, res) => {
  const { id } = req.params;
  const sql = `
    UPDATE tasks
SET is_completed = 1
WHERE id = ?`;

  db.run(sql, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: "Дело выполнено",
    });
  });
});

app.delete("/tasks/:id", (req, res) => {
  const { id } = req.params;
  const sql = `
    DELETE FROM tasks
WHERE id = ?`;

  db.run(sql, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: "Дело удалено",
    });
  });
});

app.listen(port, () => {
  console.log(`Сервер запущен: http://localhost:${port}`);
});
