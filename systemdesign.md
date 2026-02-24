## ChatlockUP – Production-Grade End-to-End Encrypted System Design

## 1. Overview

CipherChat is a secure, real-time messaging platform built with **end-to-end encryption (E2EE)**.  
Messages are encrypted on the client and decrypted only on the recipient's device.  
The server never has access to plaintext messages.

---

## 2. Goals

### Functional Goals
- 1:1 real-time messaging
- Secure user authentication
- Message delivery acknowledgment
- Offline message storage (ciphertext only)
- Multi-device support (future)

### Non-Functional Goals
- End-to-End Encryption
- High availability
- Horizontal scalability
- Low latency (<200ms message delivery)
- Zero plaintext storage on server

---

## 3. Technology Stack

### Frontend
- React (TypeScript)
- Vite
- Web Crypto API (ECDH + AES-GCM)
- IndexedDB (private key storage)

### Backend
- Node.js (TypeScript)
- Express.js (REST APIs)
- WebSocket (ws) for real-time communication
- Drizzle ORM
- Redis (Pub/Sub for scaling)

### Database
- MongoDB (stores ciphertext only)

### Infrastructure
- Nginx (reverse proxy)
- Docker
- Kubernetes (auto-scaling)
- TLS 1.3 (WSS secure transport)

---

## 4. High-Level Architecture

Client A  
→ Encrypts message using shared secret  
→ Sends encrypted payload over WSS  
→ Backend routes ciphertext  
→ MongoDB stores ciphertext  
→ Client B receives ciphertext  
→ Decrypts locally  

Server acts only as:
- Message relay
- Authentication verifier
- Ciphertext storage layer

---

## 5. Encryption Flow

1. User generates public/private key pair.
2. Public key is shared with other users.
3. Sender derives shared secret using ECDH.
4. Message encrypted using AES-GCM.
5. Ciphertext sent to server.
6. Receiver derives same shared secret.
7. Message decrypted locally.

---

## 6. Authentication Model

- Public-key based identity
- Optional JWT for session handling
- Password never required (optional enhancement)
- Private keys never leave client device

---

## 7. Real-Time Messaging Flow

1. Client connects via WebSocket (WSS).
2. Auth token validated.
3. Encrypted message emitted.
4. Server publishes via Redis.
5. Target client receives ciphertext.
6. Client decrypts and renders.

---

## 8. Database Design

### Users Collection
- _id
- username
- publicKey
- createdAt

### Messages Collection
- _id
- senderId
- receiverId
- encryptedPayload
- iv
- timestamp
- deliveryStatus

Note: No plaintext content stored.

---

## 9. Scalability Strategy

- Horizontal scaling with Kubernetes
- Stateless backend
- Redis Pub/Sub for multi-instance message routing
- MongoDB cluster for data replication
- CDN for static assets

---

## 10. Security Considerations

- TLS 1.3 enforced
- AES-256-GCM encryption
- ECDH key exchange
- Private keys stored in IndexedDB
- Rate limiting & DDoS protection
- Input validation & sanitization
- Zero-knowledge architecture

---

## 11. Failure Handling

- Retry mechanism for undelivered messages
- Message queue buffering (Redis)
- Health checks in Kubernetes
- Database replication for failover

---

## 12. Future Enhancements

- Double Ratchet algorithm
- Forward secrecy
- Group messaging
- Encrypted file sharing
- Push notifications
- Multi-device synchronization
- Metadata protection layer

---

## 13. Tradeoffs

Pros:
- Strong privacy
- Secure by design
- Horizontally scalable

Cons:
- Complex key management
- Harder message recovery
- Increased client-side responsibility

---

## 14. Conclusion

CipherChat is a secure, scalable, production-ready encrypted messaging platform.  
The system ensures that only communicating users can read messages, while the server acts solely as a relay and storage layer for encrypted data.
