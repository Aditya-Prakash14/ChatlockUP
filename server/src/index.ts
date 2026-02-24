// src/index.ts
import http from 'http';

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, TypeScript with Node.js!');
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on [http://localhost:${PORT}](http://localhost:${PORT})`);
});
