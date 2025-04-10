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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`📚 Сервер запущен на http://localhost:${PORT}`);
});
