const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const ExcelJS = require("exceljs");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.urlencoded({ extended: true })); // для form-data без файлов

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

// Добавляем новый маршрут для скачивания книги
app.get("/books/download/:id", (req, res) => {
  const bookId = req.params.id;

  db.get("SELECT pdf_filename FROM book WHERE id = ?", [bookId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || !row.pdf_filename) {
      return res.status(404).json({ error: "Файл не найден" });
    }

    const filePath = path.join(__dirname, "uploads", row.pdf_filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Файл не найден на сервере" });
    }

    // Вот здесь используем res.download с указанием имени файла
    res.download(filePath, row.pdf_filename, (err) => {
      if (err) {
        console.error("Ошибка при скачивании файла:", err);
        res.status(500).json({ error: "Ошибка при скачивании файла" });
      }
    });
  });
});

app.post("/books", upload.single("book-pdf"), async (req, res) => {
  try {
    const { name, publish_date, publisher, count } = req.body;
    const pdf_filename = req.file ? req.file.filename : null;

    // Валидация данных
    if (!name || !publish_date || !publisher || !count) {
      return res
        .status(400)
        .json({ error: "Все поля обязательны для заполнения" });
    }

    db.run(
      "INSERT INTO book (name, publish_date, publisher, count, pdf_filename) VALUES (?, ?, ?, ?, ?)",
      [name, publish_date, publisher, count, pdf_filename],
      function (err) {
        if (err) {
          console.error("Ошибка базы данных:", err);
          return res
            .status(500)
            .json({ error: "Ошибка при добавлении книги в базу данных" });
        }

        res.json({
          success: true,
          id: this.lastID,
        });
      }
    );
  } catch (error) {
    console.error("Ошибка сервера:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
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

// Поиск книги по id
app.get("/book/:id", (req, res) => {
  const bookId = req.params.id;
  db.get("SELECT * FROM book WHERE id = ?", [bookId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Книга не найдена" });
    res.json(row);
  });
});

// Поиск книги по части названия
app.get("/books/name/:name", (req, res) => {
  db.all(
    "SELECT * FROM book WHERE name LIKE ?",
    [`%${req.params.name}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Пользователи
app.get("/user", (req, res) => {
  db.all("SELECT id, username, is_admin FROM user", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// эскпорт
app.get("/export-books", (req, res) => {
  db.all("SELECT * FROM book", async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Книги");

    // Заголовки столбцов
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Название", key: "name", width: 30 },
      { header: "Дата публикации", key: "publish_date", width: 15 },
      { header: "Издательство", key: "publisher", width: 25 },
      { header: "Количество", key: "count", width: 12 },
      { header: "Имя PDF-файла", key: "pdf_filename", width: 40 },
    ];

    // Заполнение строк
    rows.forEach((row) => {
      worksheet.addRow(row);
    });

    // Настройка заголовков HTTP
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader("Content-Disposition", "attachment; filename=books.xlsx");

    // Отправка файла
    await workbook.xlsx.write(res);
    res.end();
  });
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
