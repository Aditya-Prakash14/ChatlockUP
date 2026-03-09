import React, { useState } from 'react';

const COLORS = [
  'linear-gradient(135deg, #3b82f6, #8b5cf6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
  'linear-gradient(135deg, #14b8a6, #3b82f6)',
];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function ContactList({ contacts, activeContact, onSelect, onAddContact, onOpenScanner, messages }) {
  const [newContact, setNewContact] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = newContact.trim();
    if (trimmed) {
      onAddContact(trimmed);
      setNewContact('');
    }
  };

  const getLastMessage = (contact) => {
    const msgs = messages?.[contact];
    if (!msgs || msgs.length === 0) return null;
    return msgs[msgs.length - 1];
  };

  return (
    <>
      <div className="search-bar">
        <form onSubmit={handleAdd}>
          <input
            value={newContact}
            onChange={(e) => setNewContact(e.target.value)}
            placeholder="Add contact by username…"
          />
          <button type="submit" className="btn-add">+</button>
          <button type="button" className="btn-scan" onClick={onOpenScanner} title="Scan QR code">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
          </button>
        </form>
      </div>

      <div className="contact-list">
        {contacts.length === 0 ? (
          <div className="contact-empty">
            No contacts yet.<br />Add someone to start chatting.
          </div>
        ) : (
          <>
            <div className="contact-list-label">Messages</div>
            {contacts.map((c) => {
              const last = getLastMessage(c);
              return (
                <div
                  key={c}
                  className={`contact-item${c === activeContact ? ' active' : ''}`}
                  onClick={() => onSelect(c)}
                >
                  <div className="user-avatar small" style={{ background: avatarColor(c) }}>
                    {c.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="contact-name">{c}</div>
                    {last && (
                      <div className="contact-preview">
                        {last.isMine ? 'You: ' : ''}{last.text}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
