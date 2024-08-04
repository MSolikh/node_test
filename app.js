const http = require('http');
const mysql = require('mysql');
const url = require('url');

// Создаем соединение с базой данных
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ckids'
});

connection.connect(err => {
  if (err) {
    console.error('Ошибка подключения: ' + err.stack);
    return;
  }
  console.log('Подключено к базе данных.');
});

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
  // Устанавливаем заголовки для CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработка preflight-запросов
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Обработка POST-запросов
  if (req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const postData = JSON.parse(body);
        const categories = postData.categories || [];

        if (Array.isArray(categories)) {
          const numbers = categories.filter(Number.isInteger);
          const numbersList = numbers.join(',');

          if (numbersList) {
            const data = [];
            let queriesRemaining = numbers.length;

            numbers.forEach(number => {
              const sql = `SELECT url FROM ${mysql.escapeId(number)}`;

              connection.query(sql, (err, results) => {
                if (err) {
                  res.writeHead(500, { 'Content-Type': 'text/plain' });
                  res.end('Ошибка выполнения запроса: ' + err.message);
                } else {
                  data.push(...results);
                }

                queriesRemaining -= 1;
                if (queriesRemaining === 0) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(data));
                }
              });
            });
          } else {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Нет числовых данных для поиска.');
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Категории должны быть массивом.');
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Ошибка в формате данных.');
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Метод не поддерживается.');
  }
});

const port = 3000;
server.listen(port, () => {
  console.log(`Сервер работает на http://localhost:${port}`);
});
