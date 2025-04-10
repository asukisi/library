const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const db = new sqlite3.Database('db.sqlite');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
