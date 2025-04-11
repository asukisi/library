const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Регистрация
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  db.run(
    "INSERT INTO user (username, password) VALUES (?, ?)",
    [username, password],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Вход
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    "SELECT * FROM user WHERE username = ? AND password = ?",
    [username, password],
    (err, user) => {
      if (err || !user)
        return res.status(401).json({ error: "Неверные данные" });
      res.json({
        success: true,
        username: user.username,
        isAdmin: !!user.is_admin,
      });
    }
  );
});

// Книги
app.get("/books", (req, res) => {
  db.all("SELECT * FROM book", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Добавить книгу
app.post("/books", (req, res) => {
  const { name, publish_date, publisher, count } = req.body;
  db.run(
    "INSERT INTO book (name, publish_date, publisher, count) VALUES (?, ?, ?, ?)",
    [name, publish_date, publisher, count],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Удалить книгу по id
app.delete("/books/:id", (req, res) => {
  db.run("DELETE FROM book WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Удалить книгу по названию
app.delete("/books/name/:name", (req, res) => {
  db.run(
    "DELETE FROM book WHERE name LIKE ?",
    [`%${req.params.name}%`],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

//поиск по id
app.get("/book/:id", (req, res) => {
  const bookId = req.params.id;
  db.get("SELECT * FROM book WHERE id = ?", [bookId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Книга не найдена" });
    res.json(row);
  });
});

// Поиск книги по части названия (GET /books/name/:name)
app.get("/books/name/:name", (req, res) => {
  const searchTerm = `%${req.params.name}%`;
  db.all("SELECT * FROM book WHERE name LIKE ?", [searchTerm], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// отображение всех плользователей
app.get("/user", (req, res) => {
  db.all("SELECT * FROM user", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(3000, () => console.log("Сервер запущен на порту 3000"));
