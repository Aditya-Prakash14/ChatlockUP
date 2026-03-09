import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const [error, setError] = useState('');
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    let scanner = null;
    let running = false;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('qr-reader');
        html5QrRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Parse the QR code
            const match = decodedText.match(/^chatlockup:user:(.+)$/);
            if (match) {
              running = false;
              scanner.stop().catch(() => {});
              onScan(match[1]);
            } else {
              setError('Invalid QR code. Not a ChatlockUP user.');
            }
          },
          () => {} // ignore scan failures
        );
        running = true;
      } catch (err) {
        setError('Camera access denied or unavailable. Use manual entry below.');
      }
    };

    startScanner();

    return () => {
      if (html5QrRef.current && running) {
        html5QrRef.current.stop().catch(() => {});
      }
      try {
        html5QrRef.current?.clear();
      } catch {}
    };
  }, [onScan]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const trimmed = manualInput.trim();
    if (trimmed) {
      onScan(trimmed);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Scan QR Code</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="scanner-content">
          <div className="scanner-viewport">
            <div id="qr-reader" ref={scannerRef}></div>
          </div>

          {error && <p className="scanner-error">{error}</p>}

          <div className="scanner-divider">
            <span>or enter username manually</span>
          </div>

          <form className="scanner-manual" onSubmit={handleManualSubmit}>
            <input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter username…"
            />
            <button type="submit" className="btn-primary">Add</button>
          </form>
        </div>
      </div>
    </div>
  );
}
