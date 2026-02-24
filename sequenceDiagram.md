# ChatlockUP – Sequence Diagram

## Main Flow: End-to-End Encrypted Messaging

This document covers the **complete main flow** — from user registration through sending and receiving an encrypted message.

---

## 1. Complete Main Flow – Registration → Login → Send → Receive

```mermaid
sequenceDiagram
    actor A as Client A (Sender)
    participant S as Server (Express + WS)
    participant DB as MongoDB
    actor B as Client B (Receiver)

    Note over A: ── REGISTRATION ──

    A->>A: Generate ECDH Key Pair (Web Crypto API)
    A->>A: userId = SHA-256(publicKey)
    A->>A: Store privateKey in IndexedDB

    A->>S: POST /api/auth/register { userId, publicKey }
    S->>S: Validate publicKey format
    S->>DB: Check userId uniqueness
    DB-->>S: Not found (unique)
    S->>DB: INSERT user { userId, publicKey, createdAt }
    DB-->>S: User stored
    S->>S: Generate JWT { userId, exp }
    S-->>A: 201 Created { token, userId }
    A->>A: Store JWT in memory

    Note over B: ── B ALSO REGISTERS ──

    B->>B: Generate ECDH Key Pair
    B->>B: userId = SHA-256(publicKey)
    B->>S: POST /api/auth/register { userId, publicKey }
    S->>DB: INSERT user
    DB-->>S: Stored
    S-->>B: 201 Created { token, userId }

    Note over A,B: ── WEBSOCKET CONNECTION ──

    A->>S: WS connect (Authorization: Bearer token)
    S->>S: Verify JWT
    S->>S: Map userId → socketId
    S->>DB: UPDATE user SET isOnline = true
    S-->>A: WS "connected"

    B->>S: WS connect (Authorization: Bearer token)
    S->>S: Verify JWT
    S->>S: Map userId → socketId
    S->>DB: UPDATE user SET isOnline = true
    S-->>B: WS "connected"

    Note over A,B: ── SEND ENCRYPTED MESSAGE ──

    A->>S: GET /api/users/{B.userId}/key
    S->>DB: SELECT publicKey WHERE userId = B.userId
    DB-->>S: B.publicKey
    S-->>A: 200 { publicKey: B.publicKey }

    A->>A: sharedSecret = ECDH(A.privateKey, B.publicKey)
    A->>A: iv = crypto.getRandomValues(12 bytes)
    A->>A: ciphertext = AES-GCM.encrypt(sharedSecret, iv, plaintext)

    A->>S: WS emit "message:send" { receiverId, ciphertext, iv }
    S->>S: Validate sender JWT
    S->>DB: INSERT message { senderId, receiverId, ciphertext, iv, status: "sent" }
    DB-->>S: Message stored

    S->>S: Lookup B.socketId
    S->>B: WS emit "message:receive" { senderId, ciphertext, iv, messageId }

    Note over B: ── RECEIVE & DECRYPT ──

    B->>S: GET /api/users/{A.userId}/key (if not cached)
    S->>DB: SELECT publicKey WHERE userId = A.userId
    DB-->>S: A.publicKey
    S-->>B: 200 { publicKey: A.publicKey }

    B->>B: sharedSecret = ECDH(B.privateKey, A.publicKey)
    B->>B: plaintext = AES-GCM.decrypt(sharedSecret, iv, ciphertext)
    B->>B: Render plaintext in UI

    Note over A,B: ── DELIVERY ACKNOWLEDGMENT ──

    B->>S: WS emit "message:ack" { messageId, status: "delivered" }
    S->>DB: UPDATE message SET deliveryStatus = "delivered"
    S->>A: WS emit "message:status" { messageId, status: "delivered" }

    Note over A: ✓ Message delivered
```

---

## 2. Authentication Flow – Login with Signed Challenge

```mermaid
sequenceDiagram
    actor U as Client
    participant S as Server
    participant DB as MongoDB

    U->>U: Load privateKey from IndexedDB
    U->>U: Derive publicKey from privateKey
    U->>U: userId = SHA-256(publicKey)

    U->>S: POST /api/auth/challenge { userId }
    S->>S: Generate random challenge nonce
    S->>S: Store nonce temporarily (Redis/memory)
    S-->>U: 200 { challenge }

    U->>U: signature = Sign(privateKey, challenge)
    U->>S: POST /api/auth/login { userId, signature, challenge }

    S->>DB: SELECT publicKey WHERE userId = userId
    DB-->>S: publicKey

    S->>S: Verify(publicKey, signature, challenge)

    alt Signature Valid
        S->>S: Generate JWT { userId, exp }
        S->>DB: INSERT session { userId, token, expiresAt }
        S-->>U: 200 { token }
    else Signature Invalid
        S-->>U: 401 Unauthorized
    end
```

---

## 3. Offline Message Delivery Flow

```mermaid
sequenceDiagram
    actor A as Client A (Sender)
    participant S as Server
    participant DB as MongoDB
    actor B as Client B (Offline)

    Note over B: B is OFFLINE

    A->>S: WS emit "message:send" { receiverId: B, ciphertext, iv }
    S->>S: Lookup B.socketId → NOT FOUND
    S->>DB: INSERT message { status: "sent" }
    DB-->>S: Stored
    S->>A: WS emit "message:status" { messageId, status: "sent" }

    Note over A,B: ── Time passes... ──

    B->>S: WS connect (token)
    S->>S: Verify JWT → valid
    S->>S: Map B.userId → socketId
    S->>DB: UPDATE user SET isOnline = true

    S->>DB: SELECT * FROM messages WHERE receiverId = B AND status = "sent"
    DB-->>S: [pending messages]

    loop For each pending message
        S->>B: WS emit "message:receive" { senderId, ciphertext, iv, messageId }
    end

    B->>B: Decrypt all messages locally
    B->>S: WS emit "message:ack" { messageIds, status: "delivered" }
    S->>DB: UPDATE messages SET status = "delivered"

    S->>A: WS emit "message:status" { messageIds, status: "delivered" }
    Note over A: ✓ All messages delivered
```

---

## 4. WebSocket Connection Lifecycle

```mermaid
sequenceDiagram
    actor C as Client
    participant S as Server
    participant R as Redis (Pub/Sub)
    participant DB as MongoDB

    C->>S: WS Handshake (wss:// + Bearer token)
    S->>S: Extract & verify JWT

    alt Token Valid
        S->>S: Map userId → socketId (in-memory)
        S->>DB: UPDATE user SET isOnline = true, lastSeen = now()
        S->>R: PUBLISH "presence" { userId, status: "online" }
        S-->>C: WS "connected" { userId }

        loop Every 30 seconds
            S->>C: WS ping
            C-->>S: WS pong
        end

        Note over C,S: Active session — send/receive messages

        C->>S: WS disconnect
        S->>S: Remove userId → socketId mapping
        S->>DB: UPDATE user SET isOnline = false, lastSeen = now()
        S->>R: PUBLISH "presence" { userId, status: "offline" }

    else Token Invalid
        S-->>C: WS close (4001 Unauthorized)
    end
```

---

## 5. Read Receipt Flow

```mermaid
sequenceDiagram
    actor A as Client A (Sender)
    participant S as Server
    participant DB as MongoDB
    actor B as Client B (Receiver)

    Note over B: B opens conversation with A

    B->>B: Render decrypted messages
    B->>S: WS emit "message:ack" { messageIds: [...], status: "read" }

    S->>DB: UPDATE messages SET deliveryStatus = "read" WHERE id IN [...]
    DB-->>S: Updated

    S->>S: Lookup A.socketId
    S->>A: WS emit "message:status" { messageIds: [...], status: "read" }

    Note over A: ✓ Blue ticks / Read receipts shown
```

---

## Flow Summary

| # | Flow | Actors | Key Operations |
|---|------|--------|----------------|
| 1 | **Main Flow** | Sender, Server, DB, Receiver | Register → Connect WS → Encrypt → Send → Relay → Decrypt → ACK |
| 2 | **Login** | User, Server, DB | Challenge → Sign → Verify → JWT |
| 3 | **Offline Delivery** | Sender, Server, DB, Receiver | Store → Reconnect → Deliver pending → ACK |
| 4 | **WS Lifecycle** | Client, Server, Redis, DB | Handshake → Auth → Heartbeat → Disconnect |
| 5 | **Read Receipts** | Sender, Server, DB, Receiver | Open conversation → ACK "read" → Notify sender |
