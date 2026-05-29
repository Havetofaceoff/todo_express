const express = require("express");
const initSqlJs = require("sql.js");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "todo.db");

// sql.js хранит базу в памяти, поэтому ссылку на БД держим глобально после инициализации.
let db;

// Базовые middleware: CORS для запросов с фронтенда, JSON body и отдача статических файлов.
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

// db.exec возвращает данные в формате columns/values. Эта функция переводит результат в массив объектов.
function rowsFromResult(result) {
  if (!result.length) {
    return [];
  }

  const [{ columns, values }] = result;
  return values.map((row) =>
    columns.reduce((item, column, index) => {
      item[column] = row[index];
      return item;
    }, {}),
  );
}

// Универсальный helper для SELECT-запросов с параметрами.
function all(sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);

  const rows = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }

  statement.free();
  return rows;
}

// Возвращает первую найденную строку или null, если результата нет.
function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

// Выполняет INSERT/UPDATE/DELETE и возвращает количество измененных строк.
function run(sql, params = []) {
  const statement = db.prepare(sql);
  statement.run(params);
  statement.free();
  return db.getRowsModified();
}

// После каждой мутации экспортируем in-memory SQLite обратно в файл todo.db.
function persist() {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

// Единый запрос задачи вместе с названием категории, чтобы ответы API были одинаковыми.
function taskById(id) {
  return get(
    `
      SELECT
        tasks.id,
        tasks.title,
        tasks.description,
        tasks.is_completed,
        tasks.category_id,
        categories.name AS category_name,
        tasks.created_at
      FROM tasks
      LEFT JOIN categories ON tasks.category_id = categories.id
      WHERE tasks.id = ?`,
    [id],
  );
}

// Отправляет клиенту актуальную задачу после создания или изменения.
function sendTask(id, res, status = 200) {
  const task = taskById(id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.status(status).json(task);
}

// Получение всех задач для первичной загрузки приложения.
app.get("/tasks", (req, res) => {
  const tasks = rowsFromResult(
    db.exec(`
      SELECT
        tasks.id,
        tasks.title,
        tasks.description,
        tasks.is_completed,
        tasks.category_id,
        categories.name AS category_name,
        tasks.created_at
      FROM tasks
      LEFT JOIN categories ON tasks.category_id = categories.id
      ORDER BY tasks.id DESC`),
  );

  res.json(tasks);
});

// Категории нужны фронтенду для выпадающего списка в модальном окне.
app.get("/categories", (req, res) => {
  res.json(all("SELECT id, name FROM categories ORDER BY id"));
});

// Создание задачи. title обязателен, остальные поля могут быть пустыми.
app.post("/tasks", (req, res) => {
  const { title, description, category_id } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  run(
    `
      INSERT INTO tasks (title, description, is_completed, category_id)
      VALUES (?, ?, 0, ?)`,
    [title.trim(), description || "", category_id || null],
  );

  const createdTask = get("SELECT last_insert_rowid() AS id");
  persist();
  sendTask(createdTask.id, res, 201);
});

// Редактирование основных полей задачи.
app.put("/tasks/:id", (req, res) => {
  const { id } = req.params;
  const { title, description, category_id } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  const changes = run(
    `
      UPDATE tasks
      SET title = ?, description = ?, category_id = ?
      WHERE id = ?`,
    [title.trim(), description || "", category_id || null, id],
  );

  if (!changes) {
    return res.status(404).json({ error: "Task not found" });
  }

  persist();
  sendTask(id, res);
});

// Переключение статуса выполнения. Клиент передает нужное итоговое состояние.
app.patch("/tasks/:id/complete", (req, res) => {
  const { id } = req.params;
  const completed = req.body.is_completed ? 1 : 0;
  const changes = run("UPDATE tasks SET is_completed = ? WHERE id = ?", [completed, id]);

  if (!changes) {
    return res.status(404).json({ error: "Task not found" });
  }

  persist();
  sendTask(id, res);
});

// Удаление задачи по id.
app.delete("/tasks/:id", (req, res) => {
  const { id } = req.params;
  const changes = run("DELETE FROM tasks WHERE id = ?", [id]);

  if (!changes) {
    return res.status(404).json({ error: "Task not found" });
  }

  persist();
  res.json({ message: "Task deleted" });
});

// Загружаем SQLite WASM, открываем существующий todo.db и только потом запускаем сервер.
initSqlJs().then((SQL) => {
  const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  app.listen(port, () => {
    console.log(`Server started: http://localhost:${port}`);
  });
});
