import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import ContactList from './components/ContactList';
import ChatWindow from './components/ChatWindow';
import ThemeToggle from './components/ThemeToggle';
import UserProfile from './components/UserProfile';
import QrScanner from './components/QrScanner';
import { generateKeyPair, deriveSharedKey } from './crypto/keys';
import { encryptMessage, decryptMessage } from './crypto/messaging';
import {
  savePrivateKey, loadPrivateKey,
  savePublicKey, loadPublicKey,
  saveToken, loadToken,
  saveUsername, loadUsername,
  saveContacts, loadContacts,
  saveMessages, loadMessages,
  saveSharedKeys, loadSharedKeys,
  clearAll
} from './crypto/storage';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const socket = io(API, { autoConnect: false });

function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chatlockup_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chatlockup_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  return { theme, toggleTheme };
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const [screen, setScreen] = useState(loadToken() ? 'chat' : 'auth');
  const [username, setUsername] = useState(loadUsername() || '');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [contacts, setContacts] = useState(() => loadContacts());
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState(() => loadMessages());
  const sharedKeys = useRef(loadSharedKeys());
  const [showProfile, setShowProfile] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // ── Connect socket on login ──
  useEffect(() => {
    if (screen !== 'chat') return;
    const token = loadToken();
    if (!token) return;
    socket.connect();
    socket.emit('register', loadUsername());

    return () => { socket.disconnect(); };
  }, [screen]);

  // ── Listen for incoming messages ──
  const handleIncoming = useCallback(async ({ from, encryptedPayload }) => {
    let key = sharedKeys.current[from];
    if (!key) return; // can't decrypt without shared key

    let text;
    try {
      text = await decryptMessage(encryptedPayload.ciphertext, encryptedPayload.iv, key);
    } catch {
      // Shared key may be stale (sender regenerated their keypair).
      // Re-fetch their current public key and re-derive.
      try {
        const token = loadToken();
        const res = await axios.get(`${API}/api/keys/${encodeURIComponent(from)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const myPrivateKey = loadPrivateKey();
        key = await deriveSharedKey(myPrivateKey, res.data.publicKey);
        sharedKeys.current[from] = key;
        saveSharedKeys(sharedKeys.current);
        text = await decryptMessage(encryptedPayload.ciphertext, encryptedPayload.iv, key);
      } catch {
        console.warn('Could not decrypt message from', from);
        return;
      }
    }

    setMessages((prev) => {
      const updated = {
        ...prev,
        [from]: [...(prev[from] || []), { text, isMine: false, timestamp: Date.now() }]
      };
      saveMessages(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    socket.on('receive_message', handleIncoming);
    return () => { socket.off('receive_message', handleIncoming); };
  }, [handleIncoming]);

  // ── Auth handlers ──
  const handleRegister = async () => {
    try {
      const kp = await generateKeyPair();
      const res = await axios.post(`${API}/api/auth/register`, {
        username, password, publicKey: kp.publicKey
      });
      // Save username first so scoped storage writes go to the right user
      saveUsername(res.data.username);
      saveToken(res.data.token);
      savePublicKey(kp.publicKey);
      savePrivateKey(kp.privateKey);
      setScreen('chat');
      setAuthError('');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API}/api/auth/login`, { username, password });
      // Save username first so scoped storage reads/writes target the right user
      saveUsername(res.data.username);
      saveToken(res.data.token);

      // Only generate a new keypair if we don't have one (fresh browser/device).
      if (!loadPrivateKey()) {
        const kp = await generateKeyPair();
        savePublicKey(kp.publicKey);
        savePrivateKey(kp.privateKey);
        await axios.put(`${API}/api/keys`, { publicKey: kp.publicKey }, {
          headers: { Authorization: `Bearer ${res.data.token}` }
        });
      }

      // Restore this user's persisted data into state
      setContacts(loadContacts());
      setMessages(loadMessages());
      sharedKeys.current = loadSharedKeys();

      setScreen('chat');
      setAuthError('');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Login failed');
    }
  };

  const handleLogout = () => {
    clearAll();   // only removes token, user data stays in scoped storage
    socket.disconnect();
    setScreen('auth');
    setUsername('');
    setPassword('');
    setContacts([]);
    setActiveContact(null);
    setMessages({});
    sharedKeys.current = {};
  };

  // ── Add contact & derive shared key ──
  const handleAddContact = async (contactName) => {
    if (contacts.includes(contactName)) return;
    try {
      const token = loadToken();
      const res = await axios.get(`${API}/api/keys/${encodeURIComponent(contactName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const theirPublicKey = res.data.publicKey;
      const privKey = loadPrivateKey();
      const shared = await deriveSharedKey(privKey, theirPublicKey);
      sharedKeys.current[contactName] = shared;
      saveSharedKeys(sharedKeys.current);
      setContacts((prev) => {
        const updated = [...prev, contactName];
        saveContacts(updated);
        return updated;
      });
    } catch (err) {
      if (err.response?.status === 404) {
        alert('User not found');
      } else {
        alert('Failed to add contact. Please try again.');
      }
    }
  };

  // ── Send message ──
  const handleSend = async (text) => {
    if (!activeContact) return;
    const key = sharedKeys.current[activeContact];
    if (!key) return;

    const encryptedPayload = await encryptMessage(text, key);
    socket.emit('send_message', {
      to: activeContact,
      from: loadUsername(),
      encryptedPayload
    });

    setMessages((prev) => {
      const updated = {
        ...prev,
        [activeContact]: [...(prev[activeContact] || []), { text, isMine: true, timestamp: Date.now() }]
      };
      saveMessages(updated);
      return updated;
    });
  };

  const currentUser = loadUsername();
  const initial = currentUser ? currentUser.charAt(0) : '?';

  // ── Auth screen ──
  if (screen === 'auth') {
    return (
      <div className="auth-screen">
        <div className="auth-theme-toggle">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div className="auth-card">
          <div className="auth-logo">
            <div className="logo-icon">🔒</div>
            <h1>ChatlockUP</h1>
            <p>End-to-end encrypted messaging</p>
          </div>
          {authError && <div className="auth-error">{authError}</div>}
          <div className="auth-form">
            <div className="input-group">
              <label>Username</label>
              <input
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="auth-buttons">
              <button className="btn-primary" onClick={handleLogin}>Sign In</button>
              <button className="btn-secondary" onClick={handleRegister}>Create Account</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Chat screen ──
  return (
    <div className="chat-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-info" onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
            <div className="user-avatar">{initial}</div>
            <div>
              <div className="user-name">{currentUser}</div>
              <div className="user-status">Online</div>
            </div>
          </div>
          <div className="sidebar-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
        <ContactList
          contacts={contacts}
          activeContact={activeContact}
          onSelect={setActiveContact}
          onAddContact={handleAddContact}
          onOpenScanner={() => setShowScanner(true)}
          messages={messages}
        />
      </div>
      <ChatWindow
        messages={messages[activeContact] || []}
        onSend={handleSend}
        activeContact={activeContact}
      />

      {showProfile && (
        <UserProfile
          username={currentUser}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showScanner && (
        <QrScanner
          onScan={(name) => {
            setShowScanner(false);
            handleAddContact(name);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

export default App;
