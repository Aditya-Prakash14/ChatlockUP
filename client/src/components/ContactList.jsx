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

export default function ContactList({ contacts, activeContact, onSelect, onAddContact, messages }) {
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
