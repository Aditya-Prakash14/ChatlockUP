# ChatlockUP

**A privacy-first, end-to-end encrypted real-time messaging platform where the server never sees plaintext.**

ChatlockUP is a full-stack chat application built with React and Node.js that implements client-side encryption using X25519 key exchange and XSalsa20-Poly1305 authenticated encryption via libsodium. Messages are encrypted before leaving the sender's device and can only be decrypted by the intended recipient. The server stores and relays ciphertext exclusively -- even a complete server breach reveals nothing about message content.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Security Model](#security-model)
- [Encryption Details](#encryption-details)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Client-Side Storage](#client-side-storage)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [Design Documentation](#design-documentation)
- [Threat Model](#threat-model)
- [Limitations and Future Work](#limitations-and-future-work)
- [License](#license)

---

## Architecture Overview

ChatlockUP follows a **zero-knowledge architecture**. The server is deliberately untrusted with respect to message content.

```
Client A                        Server                        Client B
--------                        ------                        --------
Generate X25519 keypair
Register (send publicKey)  ---->  Store publicKey in DB
                                                        <---- Register (send publicKey)
                                                              Generate X25519 keypair

Request B's publicKey      ---->  Return B's publicKey
Derive shared secret             (never sees secret)          Derive shared secret
  (X25519 DH)                                                   (X25519 DH)

Encrypt message                                               
  (XSalsa20-Poly1305)
Send ciphertext + nonce    ---->  Store/relay ciphertext ---->  Receive ciphertext
                                  (cannot decrypt)              Decrypt message
                                                                  (XSalsa20-Poly1305)
```

The server performs three roles:
1. **Authentication gateway** -- verifies credentials and issues JWT tokens.
2. **Public key directory** -- stores and serves user public keys for key exchange.
3. **Ciphertext relay and store** -- routes encrypted payloads between clients over WebSocket and persists them in PostgreSQL for offline delivery.

At no point does the server possess the shared secret or any material capable of decrypting messages.

---

## Technology Stack

### Backend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js (>=18) | Server execution environment |
| Framework | Express 5 | REST API routing and middleware |
| Real-Time | Socket.IO 4 | Bidirectional WebSocket communication |
| Database | PostgreSQL | Persistent storage of users and ciphertext |
| ORM | Prisma 6 | Type-safe database access and migrations |
| Authentication | JSON Web Tokens (jsonwebtoken) | Stateless session management |
| Password Hashing | bcrypt (cost factor 12) | Secure credential storage |
| Security | Helmet, express-rate-limit, CORS | HTTP hardening and abuse prevention |

### Frontend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React 19 | UI component library |
| Build Tool | Create React App | Build and development toolchain |
| Encryption | libsodium-wrappers | X25519 key exchange, XSalsa20-Poly1305 encryption |
| HTTP Client | Axios | REST API communication |
| Real-Time | socket.io-client | WebSocket client for live messaging |
| QR Codes | qrcode.react, html5-qrcode | QR generation and camera-based scanning |
| Testing | Jest, React Testing Library | Unit and component testing |

---

## Security Model

### Zero-Knowledge Guarantee

The server stores only ciphertext and nonces. It never receives, computes, or caches:
- Plaintext messages
- Private keys
- Shared secrets
- Session encryption keys

### Authentication Flow

1. **Registration**: Client generates an X25519 keypair, sends the public key along with a username and password. The server hashes the password with bcrypt (12 rounds) and stores the public key.
2. **Login**: Client submits username and password. Server verifies against the bcrypt hash. On success, a JWT is issued with a 7-day expiry containing the user ID and username.
3. **Key Regeneration**: If a client logs in on a new device without an existing private key, a fresh keypair is generated and the public key is updated on the server via an authenticated PUT request.

### Transport Security

- All WebSocket connections should use WSS (TLS) in production.
- CORS is restricted to explicitly allowed origins.
- Helmet sets secure HTTP headers (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, etc.).
- Rate limiting is enforced at 100 requests per 15-minute window per IP.

---

## Encryption Details

### Key Generation

ChatlockUP uses **X25519** (Curve25519 Diffie-Hellman) for key exchange, implemented through libsodium's `crypto_box_keypair()`.

```
KeyPair = {
  publicKey: 32 bytes (Base64 encoded for storage/transport)
  privateKey: 32 bytes (Base64 encoded, stored only in client localStorage)
}
```

### Key Exchange

When User A wants to communicate with User B:

1. User A fetches User B's public key from the server (`GET /api/keys/:username`).
2. User A computes the shared secret: `sharedKey = crypto_box_beforenm(B.publicKey, A.privateKey)`.
3. This produces a 32-byte shared key via X25519 + HSalsa20 key derivation.
4. User B independently computes the same shared key using their private key and A's public key.

The shared key is cached in localStorage (scoped per user) to avoid repeated computation.

### Message Encryption

Each message is encrypted using **XSalsa20-Poly1305** (libsodium's `crypto_secretbox_easy`):

```
nonce     = 24 random bytes (crypto_secretbox_NONCEBYTES)
ciphertext = crypto_secretbox_easy(plaintext, nonce, sharedKey)
```

The ciphertext and nonce (IV) are Base64-encoded and sent to the server. The nonce is generated fresh for every message using a cryptographically secure random number generator, preventing nonce reuse.

### Decryption

```
plaintext = crypto_secretbox_open_easy(ciphertext, nonce, sharedKey)
```

If decryption fails (e.g., the shared key has rotated), the client attempts to re-derive the shared key by re-fetching the sender's public key from the server and retrying.

---

## Project Structure

```
ChatlockUP/
|-- package.json                  Root package (Prisma adapter dependency)
|-- arch.md                       Architecture documentation
|-- classDiagram.md               UML class diagram (Mermaid)
|-- ErDiagram.md                  Entity-relationship diagram (Mermaid)
|-- sequenceDiagram.md            Sequence diagrams (Mermaid)
|-- useCaseDiagram.md             Use case diagram (Mermaid)
|-- systemdesign.md               System design document
|-- lld.md                        Low-level design document
|-- idea.md                       Project idea and requirements
|
|-- server/
|   |-- index.js                  Express + Socket.IO server entry point
|   |-- db.js                     Prisma client singleton
|   |-- package.json              Server dependencies
|   |-- middleware/
|   |   |-- auth.js               JWT verification middleware
|   |-- models/
|   |   |-- User.js               User data access object (Prisma queries)
|   |   |-- Message.js            Message data access object (Prisma queries)
|   |-- routes/
|   |   |-- auth.js               POST /register, POST /login
|   |   |-- keys.js               GET /:username, PUT / (public key management)
|   |-- prisma/
|       |-- schema.prisma         Database schema definition
|       |-- migrations/
|           |-- 0_init/
|               |-- migration.sql Initial migration (users + messages tables)
|
|-- client/
    |-- package.json              Client dependencies
    |-- vercel.json               Vercel SPA rewrite rules
    |-- public/
    |   |-- index.html            HTML entry point
    |   |-- manifest.json         PWA manifest
    |   |-- robots.txt            Crawler directives
    |-- build/                    Production build output
    |-- src/
        |-- App.js                Root component (auth, chat, socket management)
        |-- App.css               Application styles
        |-- index.js              React DOM entry point
        |-- index.css             Global styles
        |-- components/
        |   |-- ChatWindow.jsx    Message display and compose area
        |   |-- ContactList.jsx   Sidebar contact list with search
        |   |-- MessageBubble.jsx Individual message rendering
        |   |-- QrScanner.jsx     QR code scanner (camera + manual entry)
        |   |-- ThemeToggle.jsx   Light/dark theme switch
        |   |-- UserProfile.jsx   Profile modal with QR code generation
        |-- crypto/
            |-- keys.js           X25519 keypair generation and ECDH derivation
            |-- messaging.js      XSalsa20-Poly1305 encrypt/decrypt functions
            |-- storage.js        localStorage wrapper (user-scoped key/data persistence)
```

---

## Database Schema

ChatlockUP uses PostgreSQL with Prisma ORM. The schema is defined in `server/prisma/schema.prisma`.

### Users Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | Primary key, auto-generated | Internal identifier |
| username | VARCHAR(50) | Unique, not null | User-chosen display name |
| password_hash | TEXT | Not null | bcrypt hash (12 rounds) |
| public_key | TEXT | Not null | Base64-encoded X25519 public key |
| created_at | TIMESTAMP(6) | Default: now() | Registration timestamp |

### Messages Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | Primary key, auto-generated | Internal identifier |
| sender_id | UUID | Foreign key -> users.id | Sender reference |
| recipient_id | UUID | Foreign key -> users.id | Recipient reference |
| ciphertext | TEXT | Not null | Base64-encoded encrypted payload |
| nonce | TEXT | Not null | Base64-encoded XSalsa20 nonce (24 bytes) |
| created_at | TIMESTAMP(6) | Default: now() | Storage timestamp |

The messages table has an index on `recipient_id` (`idx_messages_recipient`) for efficient offline message retrieval.

Messages are transient by design: once delivered in real-time, they are deleted from the server. Only messages for offline recipients persist until the next connection.

---

## API Reference

### Authentication

#### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "username": "alice",
  "password": "securepassword",
  "publicKey": "Base64-encoded-X25519-public-key"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "alice"
}
```

**Error Responses:**
- `400` -- Missing required fields (username, password, publicKey)
- `409` -- Username already taken
- `500` -- Internal server error

#### POST /api/auth/login

Authenticate and receive a session token.

**Request Body:**
```json
{
  "username": "alice",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "alice"
}
```

**Error Responses:**
- `400` -- Missing required fields
- `401` -- Invalid credentials
- `500` -- Internal server error

### Public Key Management

All key routes require a valid JWT in the `Authorization: Bearer <token>` header.

#### GET /api/keys/:username

Retrieve a user's public key for key exchange.

**Response (200):**
```json
{
  "username": "bob",
  "publicKey": "Base64-encoded-X25519-public-key"
}
```

**Error Responses:**
- `401` -- Missing or invalid token
- `404` -- User not found
- `500` -- Internal server error

#### PUT /api/keys

Update your own public key (used after keypair regeneration on a new device).

**Request Body:**
```json
{
  "publicKey": "Base64-encoded-new-X25519-public-key"
}
```

**Response (200):**
```json
{
  "message": "Public key updated"
}
```

**Error Responses:**
- `400` -- Missing publicKey field
- `401` -- Missing or invalid token
- `500` -- Internal server error

---

## WebSocket Events

ChatlockUP uses Socket.IO for real-time communication. The WebSocket server runs on the same HTTP server as the REST API.

### Client-to-Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `register` | `username` (string) | Associates the socket with a username. Triggers delivery of any pending offline messages. |
| `send_message` | `{ to, from, encryptedPayload: { ciphertext, iv } }` | Sends an encrypted message. The server persists the ciphertext and relays it to the recipient if online. |

### Server-to-Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `receive_message` | `{ from, encryptedPayload: { ciphertext, iv }, messageId }` | Delivers an encrypted message from another user. |

### Offline Message Delivery

When a user connects and emits the `register` event:
1. The server queries the messages table for all rows where `recipient_id` matches the user.
2. Each pending message is emitted as a `receive_message` event.
3. After successful emission, the message row is deleted from the database.

This store-and-forward mechanism ensures no messages are lost when a recipient is temporarily offline.

### Connection Configuration

```
Transports:     websocket, polling (fallback)
Ping Timeout:   60,000 ms
Ping Interval:  25,000 ms
Reconnection:   enabled (max 10 attempts, 1-5 second backoff)
```

---

## Client-Side Storage

All client-side data is stored in `localStorage` using a namespaced key scheme. Data is scoped per user so that multiple accounts on the same browser do not conflict.

### Key Scheme

| Key Pattern | Scope | Content |
|-------------|-------|---------|
| `chatlockup_token` | Global | JWT session token |
| `chatlockup_username` | Global | Currently logged-in username |
| `chatlockup_u_{username}_privateKey` | Per-user | Base64-encoded X25519 private key |
| `chatlockup_u_{username}_publicKey` | Per-user | Base64-encoded X25519 public key |
| `chatlockup_u_{username}_contacts` | Per-user | JSON array of contact usernames |
| `chatlockup_u_{username}_messages` | Per-user | JSON object mapping contact -> message array |
| `chatlockup_u_{username}_sharedKeys` | Per-user | JSON object mapping contact -> Base64 shared key |
| `chatlockup_theme` | Global | UI theme preference (light/dark) |

### Logout Behavior

On logout, only the session token (`chatlockup_token`) is removed. All user-scoped data (keypairs, contacts, messages, shared keys) is preserved so that it remains available on the next login.

---

## Features

### End-to-End Encrypted Messaging
All messages are encrypted on the sender's device using XSalsa20-Poly1305 with a shared key derived via X25519 Diffie-Hellman. The server never processes or stores plaintext.

### Real-Time Communication
Messages are delivered instantly over WebSocket connections. Socket.IO provides automatic reconnection with exponential backoff when the connection drops.

### Offline Message Queuing
When a recipient is offline, encrypted messages are persisted in PostgreSQL. They are delivered immediately when the recipient reconnects, then purged from the server.

### QR Code Contact Exchange
Users can share their identity via a QR code (`chatlockup:user:{username}` format). The QR code can be scanned using the device camera or shared as a downloadable PNG. Manual username entry is also supported as a fallback.

### User Profile with QR Generation
Each user has a profile modal displaying their username and a QR code. The QR can be downloaded or shared using the Web Share API on supported devices.

### Dark/Light Theme
The application supports both light and dark themes. The preference is persisted in localStorage and applied via a `data-theme` attribute on the document root.

### Responsive Layout
The UI adapts between desktop (sidebar + chat panel) and mobile (single-panel with back navigation) layouts.

### Automatic Key Derivation
When a new contact is added, the client automatically fetches their public key and derives a shared secret. The shared key is cached locally to avoid redundant computation.

### Decryption Retry with Key Re-derivation
If an incoming message fails to decrypt (indicating the sender may have regenerated their keypair), the client re-fetches the sender's public key, re-derives the shared secret, and retries decryption.

---

## Prerequisites

- **Node.js** >= 18.0.0
- **PostgreSQL** (local instance or hosted service such as Supabase, Neon, or Railway)
- **npm** or **yarn**

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ChatlockUP.git
cd ChatlockUP
```

### 2. Install Server Dependencies

```bash
cd server
npm install
```

### 3. Install Client Dependencies

```bash
cd ../client
npm install
```

### 4. Set Up the Database

Create a PostgreSQL database, then run the Prisma migration:

```bash
cd ../server
npx prisma migrate deploy
npx prisma generate
```

---

## Environment Variables

### Server (`server/.env`)

```
DATABASE_URL=postgresql://username:password@host:5432/chatlockup
JWT_SECRET=a-strong-random-secret-at-least-32-characters
PORT=3001
CLIENT_URL=http://localhost:3000
```

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| JWT_SECRET | Yes | Secret key for signing JWT tokens. Must be set or the server will refuse to start. |
| PORT | No | Server port (default: 3001) |
| CLIENT_URL | No | Additional allowed CORS origin (beyond localhost and the Vercel deployment) |

### Client (`client/.env`)

```
REACT_APP_API_URL=http://localhost:3001
```

| Variable | Required | Description |
|----------|----------|-------------|
| REACT_APP_API_URL | No | Backend API URL (default: https://chatlock-up.vercel.app) |

---

## Running the Application

### Development Mode

Start the server:

```bash
cd server
npm start
```

In a separate terminal, start the client:

```bash
cd client
npm start
```

The client runs on `http://localhost:3000` and the server on `http://localhost:3001`.

### Production Build

Build the client:

```bash
cd client
npm run build
```

The production-ready static files are generated in `client/build/`.

---

## Deployment

### Client (Vercel)

The client is configured for deployment on Vercel. The `client/vercel.json` file contains a rewrite rule that routes all paths to `index.html` for client-side routing:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Deploy by connecting the `client/` directory to a Vercel project.

### Server

The server can be deployed to any Node.js hosting platform (Railway, Render, Fly.io, AWS, etc.). Ensure the following:

1. The `DATABASE_URL` environment variable points to a reachable PostgreSQL instance.
2. The `JWT_SECRET` environment variable is set to a cryptographically strong random value.
3. The `CLIENT_URL` environment variable matches the deployed client origin.
4. Run `npx prisma migrate deploy` and `npx prisma generate` before starting the server.
5. TLS termination should be handled by the hosting provider or a reverse proxy (Nginx, Cloudflare, etc.).

---

## Design Documentation

The repository includes detailed design documents in the root directory:

| Document | Contents |
|----------|----------|
| [idea.md](idea.md) | Project scope, requirements, feature specifications, and scoring alignment |
| [systemdesign.md](systemdesign.md) | High-level system design including scalability, failure handling, and tradeoffs |
| [arch.md](arch.md) | Architecture overview and high-level component diagram |
| [lld.md](lld.md) | Low-level design with Drizzle ORM schemas, sequence diagrams, and repository patterns |
| [classDiagram.md](classDiagram.md) | UML class diagram covering controllers, services, repositories, and design patterns |
| [ErDiagram.md](ErDiagram.md) | Entity-relationship diagram for all database collections |
| [sequenceDiagram.md](sequenceDiagram.md) | Sequence diagrams for registration, login, messaging, and offline delivery flows |
| [useCaseDiagram.md](useCaseDiagram.md) | Use case diagram with actor-system interactions |

All diagrams are written in Mermaid syntax and render natively on GitHub.

---

## Threat Model

| Threat | Attack Vector | Mitigation |
|--------|--------------|------------|
| Server database breach | Attacker gains read access to PostgreSQL | Only ciphertext and nonces are stored. Without private keys (which never leave user devices), the data is computationally useless. |
| Man-in-the-middle | Attacker intercepts traffic between client and server | TLS encrypts the transport layer. Public keys are fetched over authenticated HTTPS endpoints. |
| Replay attacks | Attacker re-sends a captured ciphertext | Each message uses a unique 24-byte random nonce. Replayed ciphertext would produce a duplicate that the client has already processed. |
| Private key theft | Attacker gains access to user's browser localStorage | Private keys are stored in localStorage on the user's device. Physical device compromise is outside the application's threat boundary. Browser extension isolation and device-level security (screen lock, disk encryption) are the user's responsibility. |
| Brute force login | Attacker attempts many password combinations | express-rate-limit enforces 100 requests per 15 minutes per IP. bcrypt with cost factor 12 makes each password verification computationally expensive. |
| JWT token theft | Attacker steals a session token | Tokens expire after 7 days. The server validates tokens on every authenticated request. Users can log out to clear the token from the client. |
| Cross-site scripting (XSS) | Attacker injects scripts into the UI | React escapes rendered content by default. Helmet sets Content-Security-Policy and X-XSS-Protection headers. |
| Cross-site request forgery (CSRF) | Attacker triggers authenticated requests from another origin | CORS restricts requests to explicitly allowed origins. JWT is sent via Authorization header, not cookies, eliminating cookie-based CSRF vectors. |

---

## Limitations and Future Work

### Current Limitations

- **No forward secrecy.** A single static shared key is used for all messages between two users. Compromising one key exposes the entire conversation history.
- **No group chat.** Only 1:1 messaging is supported.
- **No multi-device sync.** Private keys are stored in a single browser's localStorage. Logging in on a new device generates a new keypair, breaking shared keys with existing contacts.
- **No message persistence on client.** Message history is stored in localStorage, which has a ~5-10 MB limit and can be cleared by the browser.
- **No push notifications.** Users must have the application open to receive messages.
- **No file or media sharing.** Only text messages are supported.
- **Private keys in localStorage.** IndexedDB with the Web Crypto API's non-extractable keys would provide stronger protection against XSS-based key exfiltration.

### Planned Improvements

- **Double Ratchet Protocol** -- Per-message key derivation for forward secrecy and break-in recovery, following the Signal Protocol specification.
- **Group messaging** -- Sender Keys or MLS (Messaging Layer Security) for efficient encrypted group communication.
- **Encrypted file sharing** -- Client-side encryption of file attachments before upload.
- **Push notifications** -- Web Push API integration for background message alerts.
- **Multi-device synchronization** -- Encrypted key backup and cross-device key distribution.
- **IndexedDB key storage** -- Migration from localStorage to IndexedDB with non-extractable CryptoKey objects.
- **Metadata protection** -- Sealed sender and traffic padding to reduce metadata leakage.
- **Delivery and read receipts** -- Three-state message tracking (sent, delivered, read) with WebSocket acknowledgments.

---

## License

This project is provided as-is for educational purposes.
