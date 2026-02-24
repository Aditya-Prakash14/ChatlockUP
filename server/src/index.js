"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const http_1 = __importDefault(require("http"));
const server = http_1.default.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello, TypeScript with Node.js!');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on [http://localhost:${PORT}](http://localhost:${PORT})`);
});
//# sourceMappingURL=index.js.map