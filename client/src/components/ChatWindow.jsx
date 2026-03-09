import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatWindow({ messages, onSend, activeContact, onBack }) {
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  if (!activeContact) {
    return (
      <div className="chat-main">
        <div className="chat-empty">
          <span className="empty-icon">💬</span>
          <h2>Your messages</h2>
          <p>Select a conversation from the sidebar or add a new contact to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-main">
      <div className="chat-header">
        <div className="header-left">
          <button className="btn-back-mobile" onClick={onBack} aria-label="Back to contacts">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div className="user-avatar small">{activeContact.charAt(0).toUpperCase()}</div>
          <div>
            <div className="header-name">{activeContact}</div>
            <div className="header-status">End-to-end encrypted</div>
          </div>
        </div>
        <div className="e2e-badge">🔒 E2E Encrypted</div>
      </div>

      <div className="messages-area">
        {messages.map((m, i) => (
          <MessageBubble key={i} text={m.text} isMine={m.isMine} timestamp={m.timestamp} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="compose-bar">
        <form onSubmit={handleSubmit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
          />
          <button type="submit" className="btn-send" aria-label="Send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
}
