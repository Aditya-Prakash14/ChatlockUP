# ChatlockUP – Project Idea

## Privacy-First End-to-End Encrypted Messaging Platform

---

## 1. What We Are Building

ChatlockUP is a **full-stack, real-time, end-to-end encrypted (E2EE) messaging application** where the server never has access to plaintext messages. Users authenticate using cryptographic key pairs — no phone number or email required.

The backend is the primary focus, built with **OOP principles**, **clean architecture** (Controller → Service → Repository), and **design patterns** applied where they naturally fit.

---

## 2. Project Scope

### In Scope (Phase 1 – Core Deliverable)

| Area | What's Included |
|------|-----------------|
| **Authentication** | Key-pair based registration & login (no password), JWT session management |
| **1:1 Messaging** | Real-time encrypted messaging via WebSockets |
| **Encryption** | Client-side ECDH key exchange + AES-GCM encryption/decryption |
| **Message Storage** | Server stores ciphertext only — zero plaintext |
| **Offline Delivery** | Store-and-forward for offline recipients |
| **Delivery Status** | Sent → Delivered → Read acknowledgments |
| **User Discovery** | Search users by display name or userId |
| **Conversations** | List conversations, fetch message history (encrypted) |

### Out of Scope (Future Phases)

- Group chat encryption
- Double Ratchet / forward secrecy
- Encrypted file sharing
- Voice / video calling
- Push notifications
- Multi-device sync

---

## 3. Key Features

### 3.1 Cryptographic Identity System
- User identity derived from public key: `userId = SHA-256(publicKey)`
- No email, no phone number, no password
- Private key stored only on the client device (IndexedDB)
- Login via signed challenge — server verifies using stored public key

### 3.2 End-to-End Encryption (E2EE)
- **Key Exchange:** ECDH (Elliptic Curve Diffie-Hellman)
- **Encryption:** AES-256-GCM with unique IV per message
- **Implementation:** Web Crypto API (client-side only)
- Server acts purely as a relay and ciphertext storage layer

### 3.3 Real-Time Messaging
- WebSocket-based bidirectional communication
- Server routes encrypted payloads between connected clients
- Offline messages queued in MongoDB and delivered on reconnect
- Typing indicators and presence (online/offline) tracking

### 3.4 Delivery Acknowledgments
- Three-state tracking: `sent` → `delivered` → `read`
- Status updates propagated via WebSocket events
- Persisted in database for consistency

### 3.5 Conversation Management
- Automatic conversation creation on first message
- Sorted by most recent activity
- Encrypted last-message preview (encrypted client-side)

---

## 4. Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + TypeScript, Vite, Web Crypto API, IndexedDB |
| **Backend** | Node.js + TypeScript, Express.js |
| **Real-Time** | WebSocket (ws library) |
| **Database** | MongoDB |
| **ORM** | Drizzle ORM |
| **Auth** | JWT (jsonwebtoken) |
| **Caching/Pub-Sub** | Redis (for multi-instance WebSocket scaling) |
| **Infrastructure** | Docker, Nginx (reverse proxy), TLS 1.3 |

---

## 5. Backend Architecture Highlights

The backend is structured following **clean architecture** with clear separation of concerns:

```
src/
├── controllers/     # HTTP request handling, input validation
├── services/        # Business logic, orchestration
├── repositories/    # Data access layer (Drizzle ORM)
├── models/          # Drizzle schema definitions
├── middleware/      # Auth, rate limiting, error handling
├── websocket/       # WebSocket event handlers
├── utils/           # Helpers, crypto utilities
├── config/          # Environment, database config
└── types/           # TypeScript interfaces & types
```

### OOP Principles Applied
- **Encapsulation:** Each layer exposes only what's needed (service methods, repository queries)
- **Abstraction:** Repository pattern abstracts database access from business logic
- **Inheritance:** Base classes for common controller/service behavior
- **Polymorphism:** Strategy pattern for message delivery (online vs. offline)

### Design Patterns Used (where they fit naturally)
- **Repository Pattern** — decouple data access from business logic
- **Strategy Pattern** — message delivery strategy (real-time vs. store-and-forward)
- **Singleton Pattern** — database connection, WebSocket server instance
- **Observer Pattern** — WebSocket event system (pub/sub for presence, typing)
- **Factory Pattern** — creating response objects, error objects

---

## 6. Security Model

| Threat | Mitigation |
|--------|------------|
| Server Breach | Only ciphertext stored — no plaintext ever |
| MITM Attack | Public key verification + TLS 1.3 |
| Replay Attack | Unique IV (nonce) + timestamp validation |
| Key Theft | Private keys never leave client device |
| Database Leak | Encrypted blobs only — useless without private keys |
| Brute Force | Rate limiting (60 msgs/min per user) |

> **Core Principle:** If the server is fully compromised, attackers still cannot read any messages.

---

## 7. Target Users

- Privacy-conscious individuals
- Journalists and activists
- Developers and cybersecurity professionals
- Organizations needing secure internal communication

---

## 8. Scoring Alignment

| Criteria | How ChatlockUP Addresses It |
|----------|----------------------------|
| **Backend (75%)** | Clean Controller → Service → Repository architecture, OOP, design patterns, WebSocket handling, JWT auth, Drizzle ORM |
| **Frontend (25%)** | React UI for chat, encryption/decryption via Web Crypto API, IndexedDB key management |
| **Regular Commits** | Feature-by-feature incremental development |
| **OOP Principles** | Encapsulation, abstraction, inheritance, polymorphism throughout backend |
| **Design Patterns** | Repository, Strategy, Singleton, Observer, Factory — used where they naturally fit |