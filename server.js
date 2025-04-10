const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');  // для хэширования паролей

const app = express();
const db = new sqlite3.Database('db.sqlite');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Регистрация пользователя
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO user (username, password) VALUES (?, ?)',
    [username, hashedPassword],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Вход пользователя
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  db.get('SELECT * FROM user WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!row) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }

    const isPasswordValid = bcrypt.compareSync(password, row.password);
    if (isPasswordValid) {
      res.json({ success: true, userId: row.id });
    } else {
      res.status(400).json({ error: 'Неверный пароль' });
    }
  });
});

app.get('/books', (req, res) => {
  db.all('SELECT * FROM book', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Получить книгу по ID
app.get('/book/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM book WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// Получить книги по названию
app.get('/books/name/:name', (req, res) => {
  const { name } = req.params;
  db.all('SELECT * FROM book WHERE name LIKE ?', [`%${name}%`], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/books', (req, res) => {
  const { name, publish_date, publisher, count } = req.body;
  if (!name || !publish_date || !publisher || !count) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  db.run(
    'INSERT INTO book (name, publish_date, publisher, count) VALUES (?, ?, ?, ?)',
    [name, publish_date, publisher, count],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Удалить книгу по ID
app.delete('/books/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM book WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Удалить книгу по названию
app.delete('/books/name/:name', (req, res) => {
  const { name } = req.params;
  db.run('DELETE FROM book WHERE name LIKE ?', [`%${name}%`], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`📚 Сервер запущен на http://localhost:${PORT}`);
});
