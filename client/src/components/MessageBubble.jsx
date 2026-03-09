import React from 'react';

export default function MessageBubble({ text, isMine, timestamp }) {
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
      <div className="message-bubble">
        <span className="msg-text">{text}</span>
        {time && <span className="msg-time">{time}</span>}
      </div>
    </div>
  );
}
