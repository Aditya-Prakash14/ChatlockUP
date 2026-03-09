import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function UserProfile({ username, onClose }) {
  const qrValue = `chatlockup:user:${username}`;
  const qrRef = useRef(null);

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `chatlockup_${username}_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    
    try {
      if (navigator.share) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `chatlockup_${username}_qr.png`, { type: 'image/png' });
          try {
            await navigator.share({
              title: `ChatlockUP - Add ${username}`,
              text: `Scan my QR code or search my username to add me on ChatlockUP!`,
              files: [file]
            });
          } catch (err) {
            // Usually user cancellation, don't show alert
            console.log('Share error or cancel:', err);
          }
        });
      } else {
        alert('Native sharing is not supported on this device/browser.');
      }
    } catch (err) {
      console.error('Error initiating share:', err);
    }
  };

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

          <div className="qr-container" ref={qrRef}>
            <QRCodeCanvas
              value={qrValue}
              size={200}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
              className="qr-code"
            />
          </div>

          <div className="profile-qr-label">
            <span className="qr-lock-icon">🔒</span>
            Scan to add <strong>{username}</strong>
          </div>

          <div className="profile-actions">
            <button className="btn-secondary" onClick={handleDownload}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download QR
            </button>
            <button className="btn-primary" onClick={handleShare}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              Share QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
