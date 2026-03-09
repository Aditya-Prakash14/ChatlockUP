import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function UserProfile({ username, onClose }) {
  const qrValue = `chatlockup:user:${username}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Your Profile</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="profile-content">
          <div className="profile-avatar-lg">
            {username.charAt(0).toUpperCase()}
          </div>
          <h3 className="profile-username">{username}</h3>
          <p className="profile-subtitle">Share this QR code so others can add you</p>

          <div className="qr-container">
            <QRCodeSVG
              value={qrValue}
              size={200}
              level="M"
              bgColor="transparent"
              fgColor="var(--text-primary)"
              className="qr-code"
            />
          </div>

          <div className="profile-qr-label">
            <span className="qr-lock-icon">🔒</span>
            Scan to add <strong>{username}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
