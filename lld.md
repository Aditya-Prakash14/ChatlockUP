# ChatlockUP – Low-Level Design (LLD)

Production-grade End-to-End Encrypted Chat Application  
Tech Stack: React (TS) + Node (TS) + MongoDB + Drizzle ORM

---

## 1. Database Schema – Drizzle ORM Models

ChatlockUP uses MongoDB via Drizzle ORM. All message content is stored as ciphertext only.

---

### 1.1 Users Collection

```typescript
import { pgTable, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // SHA-256 hash of the user's public key — serves as their unique identity
  userId: varchar("user_id", { length: 64 })
    .notNull()
    .unique(),

  // Base64-encoded ECDH public key
  publicKey: text("public_key")
    .notNull(),

  // Optional display name (encrypted on client before sending)
  displayName: text("display_name"),

  // Whether the user is currently connected via WebSocket
  isOnline: boolean("is_online")
    .default(false)
    .notNull(),

  lastSeen: timestamp("last_seen"),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
});
```

**Key Design Decisions:**
- `userId` = `SHA-256(publicKey)` — cryptographic identity, no email/phone needed
- `publicKey` stored in Base64 for ECDH key exchange
- `displayName` is optional and encrypted client-side before storage
- No password field — authentication is key-pair based

---

### 1.2 Messages Collection

```typescript
import { pgTable, text, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const messages = pgTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // Sender's userId (SHA-256 of their publicKey)
  senderId: varchar("sender_id", { length: 64 })
    .notNull()
    .references(() => users.userId),

  // Recipient's userId
  receiverId: varchar("receiver_id", { length: 64 })
    .notNull()
    .references(() => users.userId),

  // AES-GCM encrypted message payload (Base64)
  ciphertext: text("ciphertext")
    .notNull(),

  // Initialization vector used for AES-GCM (Base64, unique per message)
  iv: varchar("iv", { length: 32 })
    .notNull(),

  // ECDH ephemeral public key (if using per-message key exchange)
  ephemeralPublicKey: text("ephemeral_public_key"),

  // Message delivery status
  deliveryStatus: varchar("delivery_status", { length: 20 })
    .default("sent")
    .notNull(),
    // Values: "sent" | "delivered" | "read"

  // Optional: TTL for self-destruct messages (seconds)
  ttl: timestamp("ttl"),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
}, (table) => ({
  senderIdx: index("idx_messages_sender").on(table.senderId),
  receiverIdx: index("idx_messages_receiver").on(table.receiverId),
  conversationIdx: index("idx_messages_conversation").on(table.senderId, table.receiverId),
  createdAtIdx: index("idx_messages_created_at").on(table.createdAt),
}));
```

**Key Design Decisions:**
- `ciphertext` — AES-GCM encrypted blob, server never sees plaintext
- `iv` — unique nonce per message, prevents replay attacks
- `ephemeralPublicKey` — supports per-message ECDH for forward secrecy (Phase 2)
- `ttl` — enables self-destructing messages
- Indexed on `senderId`, `receiverId`, and composite for fast conversation queries

---

### 1.3 Conversations Collection

```typescript
import { pgTable, text, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const conversations = pgTable("conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // First participant's userId
  participantA: varchar("participant_a", { length: 64 })
    .notNull()
    .references(() => users.userId),

  // Second participant's userId
  participantB: varchar("participant_b", { length: 64 })
    .notNull()
    .references(() => users.userId),

  // Reference to most recent message (for chat list ordering)
  lastMessageId: text("last_message_id"),

  // Encrypted last message preview (optional, encrypted client-side)
  lastMessagePreview: text("last_message_preview"),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
}, (table) => ({
  participantAIdx: index("idx_conv_participant_a").on(table.participantA),
  participantBIdx: index("idx_conv_participant_b").on(table.participantB),
}));
```

---

### 1.4 Sessions Collection

```typescript
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const sessions = pgTable("sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  userId: varchar("user_id", { length: 64 })
    .notNull()
    .references(() => users.userId),

  // JWT or session token
  token: text("token")
    .notNull()
    .unique(),

  // Device/client identifier
  deviceFingerprint: text("device_fingerprint"),

  expiresAt: timestamp("expires_at")
    .notNull(),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
});
```

---

### 1.5 Key Exchange Requests Collection (Phase 2 – Forward Secrecy)

```typescript
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const keyExchangeRequests = pgTable("key_exchange_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // Who initiated the key exchange
  initiatorId: varchar("initiator_id", { length: 64 })
    .notNull()
    .references(() => users.userId),

  // Target user
  targetId: varchar("target_id", { length: 64 })
    .notNull()
    .references(() => users.userId),

  // Ephemeral public key for this exchange
  ephemeralPublicKey: text("ephemeral_public_key")
    .notNull(),

  // Status of the key exchange
  status: varchar("status", { length: 20 })
    .default("pending")
    .notNull(),
    // Values: "pending" | "accepted" | "expired"

  expiresAt: timestamp("expires_at")
    .notNull(),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
});
```

---

### 1.6 Entity Relationship Diagram (ERD)

```
┌──────────────────┐       ┌──────────────────────────┐
│     users         │       │       sessions            │
├──────────────────┤       ├──────────────────────────┤
│ id (PK)          │◄──┐   │ id (PK)                  │
│ userId (unique)  │   │   │ userId (FK → users)       │
│ publicKey        │   │   │ token                     │
│ displayName      │   │   │ deviceFingerprint         │
│ isOnline         │   │   │ expiresAt                 │
│ lastSeen         │   └───│ createdAt                 │
│ createdAt        │       └──────────────────────────┘
│ updatedAt        │
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌────────────────────────────┐      ┌──────────────────────────┐
│        messages             │      │     conversations         │
├────────────────────────────┤      ├──────────────────────────┤
│ id (PK)                    │      │ id (PK)                  │
│ senderId (FK → users)      │      │ participantA (FK → users)│
│ receiverId (FK → users)    │      │ participantB (FK → users)│
│ ciphertext                 │      │ lastMessageId            │
│ iv                         │      │ lastMessagePreview       │
│ ephemeralPublicKey         │      │ createdAt                │
│ deliveryStatus             │      │ updatedAt                │
│ ttl                        │      └──────────────────────────┘
│ createdAt                  │
└────────────────────────────┘
         │
         │ (Phase 2)
         ▼
┌──────────────────────────────┐
│   key_exchange_requests       │
├──────────────────────────────┤
│ id (PK)                      │
│ initiatorId (FK → users)     │
│ targetId (FK → users)        │
│ ephemeralPublicKey            │
│ status                       │
│ expiresAt                    │
│ createdAt                    │
└──────────────────────────────┘
```

---

## 2. Sequence Diagrams

### 2.1 User Registration

```
┌──────────┐                          ┌──────────┐                    ┌──────────┐
│  Client   │                          │  Server   │                    │ MongoDB  │
└─────┬────┘                          └─────┬────┘                    └─────┬────┘
      │                                      │                              │
      │  1. Generate ECDH Key Pair           │                              │
      │     (Web Crypto API)                 │                              │
      │                                      │                              │
      │  2. Compute userId =                 │                              │
      │     SHA-256(publicKey)               │                              │
      │                                      │                              │
      │  3. Store privateKey in IndexedDB    │                              │
      │                                      │                              │
      │  4. POST /api/auth/register          │                              │
      │     { userId, publicKey }            │                              │
      │ ────────────────────────────────────►│                              │
      │                                      │                              │
      │                                      │  5. Validate publicKey       │
      │                                      │     format & uniqueness      │
      │                                      │                              │
      │                                      │  6. INSERT user document     │
      │                                      │ ────────────────────────────►│
      │                                      │                              │
      │                                      │  7. User stored             │
      │                                      │ ◄────────────────────────────│
      │                                      │                              │
      │                                      │  8. Generate JWT token       │
      │                                      │                              │
      │  9. 201 Created                      │                              │
      │     { token, userId }                │                              │
      │ ◄────────────────────────────────────│                              │
      │                                      │                              │
      │  10. Store JWT in memory             │                              │
      │                                      │                              │
```

---

### 2.2 User Authentication (Login)

```
┌──────────┐                          ┌──────────┐                    ┌──────────┐
│  Client   │                          │  Server   │                    │ MongoDB  │
└─────┬────┘                          └─────┬────┘                    └─────┬────┘
      │                                      │                              │
      │  1. Load privateKey from IndexedDB   │                              │
      │                                      │                              │
      │  2. Derive publicKey from privateKey │                              │
      │                                      │                              │
      │  3. Compute userId =                 │                              │
      │     SHA-256(publicKey)               │                              │
      │                                      │                              │
      │  4. POST /api/auth/login             │                              │
      │     { userId, signedChallenge }      │                              │
      │ ────────────────────────────────────►│                              │
      │                                      │                              │
      │                                      │  5. Fetch user by userId     │
      │                                      │ ────────────────────────────►│
      │                                      │                              │
      │                                      │  6. Return user + publicKey  │
      │                                      │ ◄────────────────────────────│
      │                                      │                              │
      │                                      │  7. Verify signature using   │
      │                                      │     stored publicKey         │
      │                                      │                              │
      │                                      │  8. Generate JWT             │
      │                                      │                              │
      │  9. 200 OK { token }                 │                              │
      │ ◄────────────────────────────────────│                              │
      │                                      │                              │
```

---

### 2.3 Sending an Encrypted Message (1:1)

```
┌──────────┐                    ┌──────────┐                 ┌──────────┐        ┌──────────┐
│ Client A  │                    │  Server   │                 │ MongoDB  │        │ Client B  │
└─────┬────┘                    └─────┬────┘                 └─────┬────┘        └─────┬────┘
      │                                │                            │                   │
      │  1. GET /api/users/:id/key     │                            │                   │
      │     (fetch B's publicKey)      │                            │                   │
      │ ──────────────────────────────►│                            │                   │
      │                                │  2. Query user             │                   │
      │                                │ ──────────────────────────►│                   │
      │                                │                            │                   │
      │                                │  3. Return publicKey       │                   │
      │                                │ ◄──────────────────────────│                   │
      │  4. 200 { publicKey }          │                            │                   │
      │ ◄──────────────────────────────│                            │                   │
      │                                │                            │                   │
      │  5. ECDH: derive sharedSecret  │                            │                   │
      │     = ECDH(A.privateKey,       │                            │                   │
      │            B.publicKey)        │                            │                   │
      │                                │                            │                   │
      │  6. Generate random IV (12b)   │                            │                   │
      │                                │                            │                   │
      │  7. AES-GCM encrypt:          │                            │                   │
      │     ciphertext = Encrypt(      │                            │                   │
      │       sharedSecret, iv, msg)   │                            │                   │
      │                                │                            │                   │
      │  8. WS: emit("message", {      │                            │                   │
      │     senderId, receiverId,      │                            │                   │
      │     ciphertext, iv })          │                            │                   │
      │ ══════════════════════════════►│                            │                   │
      │                                │                            │                   │
      │                                │  9. Store encrypted msg    │                   │
      │                                │ ──────────────────────────►│                   │
      │                                │                            │                   │
      │                                │  10. Forward to Client B   │                   │
      │                                │ ══════════════════════════════════════════════►│
      │                                │                            │                   │
      │                                │                            │    11. ECDH derive│
      │                                │                            │        sharedSecret
      │                                │                            │                   │
      │                                │                            │    12. AES-GCM    │
      │                                │                            │        decrypt    │
      │                                │                            │                   │
      │                                │                            │    13. Render     │
      │                                │                            │        plaintext  │
      │                                │                            │                   │
      │                                │  14. ACK: "delivered"      │                   │
      │                                │ ◄══════════════════════════════════════════════│
      │                                │                            │                   │
      │                                │  15. Update deliveryStatus │                   │
      │                                │ ──────────────────────────►│                   │
      │                                │                            │                   │
      │  16. ACK to sender             │                            │                   │
      │ ◄══════════════════════════════│                            │                   │
      │                                │                            │                   │
```

---

### 2.4 Offline Message Delivery

```
┌──────────┐                    ┌──────────┐                 ┌──────────┐        ┌──────────┐
│ Client A  │                    │  Server   │                 │ MongoDB  │        │ Client B  │
└─────┬────┘                    └─────┬────┘                 └─────┬────┘        └─────┬────┘
      │                                │                            │                   │
      │  1. WS: emit("message", {      │                            │       (OFFLINE)   │
      │     ciphertext, iv })          │                            │                   │
      │ ══════════════════════════════►│                            │                   │
      │                                │                            │                   │
      │                                │  2. Check: B online?       │                   │
      │                                │     → NO                   │                   │
      │                                │                            │                   │
      │                                │  3. Store ciphertext with  │                   │
      │                                │     status = "sent"        │                   │
      │                                │ ──────────────────────────►│                   │
      │                                │                            │                   │
      │  4. ACK: "sent"               │                            │                   │
      │ ◄══════════════════════════════│                            │                   │
      │                                │                            │                   │
      │                              (time passes)                  │                   │
      │                                │                            │                   │
      │                                │  5. B connects via WS      │                   │
      │                                │ ◄══════════════════════════════════════════════│
      │                                │                            │                   │
      │                                │  6. Query pending msgs     │                   │
      │                                │     for B                  │                   │
      │                                │ ──────────────────────────►│                   │
      │                                │                            │                   │
      │                                │  7. Return pending msgs    │                   │
      │                                │ ◄──────────────────────────│                   │
      │                                │                            │                   │
      │                                │  8. Forward all pending    │                   │
      │                                │     ciphertext to B        │                   │
      │                                │ ══════════════════════════════════════════════►│
      │                                │                            │                   │
      │                                │                            │    9. Decrypt all │
      │                                │                            │       messages    │
      │                                │                            │                   │
      │                                │  10. ACK: "delivered"      │                   │
      │                                │ ◄══════════════════════════════════════════════│
      │                                │                            │                   │
      │                                │  11. Update status →       │                   │
      │                                │      "delivered"           │                   │
      │                                │ ──────────────────────────►│                   │
      │                                │                            │                   │
```

---

### 2.5 WebSocket Connection Lifecycle

```
┌──────────┐                          ┌──────────┐                    ┌──────────┐
│  Client   │                          │  Server   │                    │  Redis   │
└─────┬────┘                          └─────┬────┘                    └─────┬────┘
      │                                      │                              │
      │  1. WS: connect(token)               │                              │
      │ ════════════════════════════════════►│                              │
      │                                      │                              │
      │                                      │  2. Verify JWT               │
      │                                      │                              │
      │                                      │  3. Map userId → socketId    │
      │                                      │                              │
      │                                      │  4. PUBLISH "user:online"    │
      │                                      │ ────────────────────────────►│
      │                                      │                              │
      │  5. WS: "connected"                 │                              │
      │ ◄════════════════════════════════════│                              │
      │                                      │                              │
      │         ┌────────────────────────┐   │                              │
      │         │  Active Session        │   │                              │
      │         │  - Send/receive msgs   │   │                              │
      │         │  - Heartbeat (30s)     │   │                              │
      │         └────────────────────────┘   │                              │
      │                                      │                              │
      │  6. WS: disconnect / timeout         │                              │
      │ ════════════════════════════════════►│                              │
      │                                      │                              │
      │                                      │  7. Remove socketId mapping  │
      │                                      │                              │
      │                                      │  8. Update lastSeen          │
      │                                      │                              │
      │                                      │  9. PUBLISH "user:offline"   │
      │                                      │ ────────────────────────────►│
      │                                      │                              │
```

---

### 2.6 Key Exchange – Forward Secrecy (Phase 2)

```
┌──────────┐                          ┌──────────┐                    ┌──────────┐
│ Client A  │                          │  Server   │                    │ Client B  │
└─────┬────┘                          └─────┬────┘                    └─────┬────┘
      │                                      │                              │
      │  1. Generate ephemeral key pair      │                              │
      │                                      │                              │
      │  2. POST /api/keys/exchange          │                              │
      │     { targetId, ephemeralPubKey }     │                              │
      │ ────────────────────────────────────►│                              │
      │                                      │                              │
      │                                      │  3. Store key exchange       │
      │                                      │     request (status=pending) │
      │                                      │                              │
      │                                      │  4. Notify B via WS         │
      │                                      │ ════════════════════════════►│
      │                                      │                              │
      │                                      │         5. B generates own   │
      │                                      │            ephemeral pair    │
      │                                      │                              │
      │                                      │         6. B derives shared  │
      │                                      │            secret via ECDH   │
      │                                      │            (B.ephPriv,       │
      │                                      │             A.ephPub)        │
      │                                      │                              │
      │                                      │  7. POST /api/keys/accept   │
      │                                      │     { requestId,            │
      │                                      │       ephemeralPubKey }      │
      │                                      │ ◄════════════════════════════│
      │                                      │                              │
      │                                      │  8. Update request →         │
      │                                      │     status = "accepted"      │
      │                                      │                              │
      │  9. Notify A via WS                  │                              │
      │     { B.ephemeralPubKey }             │                              │
      │ ◄════════════════════════════════════│                              │
      │                                      │                              │
      │  10. A derives shared secret         │                              │
      │      via ECDH (A.ephPriv, B.ephPub)  │                              │
      │                                      │                              │
      │  ═══════ Shared Secret Established ══════════════════════════════════│
      │  ═══════ Both sides use new key  ════════════════════════════════════│
      │                                      │                              │
```

---

## 3. API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with publicKey |
| POST | `/api/auth/login` | Authenticate via signed challenge |
| GET | `/api/users/:userId/key` | Fetch user's publicKey |
| GET | `/api/users/search?q=` | Search users by display name |
| GET | `/api/conversations` | List user's conversations |
| GET | `/api/conversations/:id/messages` | Fetch encrypted messages |
| POST | `/api/keys/exchange` | Initiate key exchange (Phase 2) |
| POST | `/api/keys/accept` | Accept key exchange (Phase 2) |
| WS | `/ws` | WebSocket connection for real-time messaging |

---

## 4. WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `message:send` | Client → Server | `{ receiverId, ciphertext, iv }` | Send encrypted message |
| `message:receive` | Server → Client | `{ senderId, ciphertext, iv, messageId }` | Receive encrypted message |
| `message:ack` | Client → Server | `{ messageId, status }` | Acknowledge delivery/read |
| `message:status` | Server → Client | `{ messageId, status }` | Delivery status update |
| `user:online` | Server → Client | `{ userId }` | User came online |
| `user:offline` | Server → Client | `{ userId }` | User went offline |
| `typing:start` | Client → Server | `{ conversationId }` | Typing indicator start |
| `typing:stop` | Client → Server | `{ conversationId }` | Typing indicator stop |
| `key:exchange` | Server → Client | `{ initiatorId, ephemeralPubKey }` | Key exchange request |

---

## 5. Data Flow Constraints

| Rule | Enforcement |
|------|-------------|
| No plaintext on server | All encryption/decryption client-side only |
| Unique IV per message | Client generates `crypto.getRandomValues(12)` |
| Private key isolation | Stored in IndexedDB, never transmitted |
| Session expiry | JWT `exp` claim + server-side session validation |
| Rate limiting | Max 60 messages/minute per user |
| Payload size limit | Max 64KB per encrypted message |
| Connection auth | JWT verified on WebSocket handshake |
