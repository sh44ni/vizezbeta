'use client';

import React, { useState } from 'react';
import { useAuth, VizUser } from '@/context/AuthContext';
import { X, UserPlus, Trash2, Shield, User, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserManagement({ isOpen, onClose }: Props) {
  const { users, addUser, deleteUser, isAdmin } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!isOpen || !isAdmin) return null;

  const handleAdd = () => {
    setError('');
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      setError('All fields are required');
      return;
    }
    if (newUsername.trim().length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    if (newPassword.trim().length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    const ok = addUser({
      name: newName.trim(),
      username: newUsername.trim().toLowerCase(),
      password: newPassword.trim(),
    });
    if (!ok) {
      setError('Username already exists');
      return;
    }
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setShowAdd(false);
  };

  const handleDelete = (username: string) => {
    if (confirmDelete === username) {
      deleteUser(username);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(username);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
        }}
      />

      {/* Panel */}
      <div
        className="animate-slide-in-right"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          maxWidth: '90vw',
          background: 'var(--surface-solid)',
          borderLeft: '1px solid var(--glass-border)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: "'Outfit', 'Inter', sans-serif",
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Shield className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              Access Management
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Manage who can access VizEz
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'var(--glass-bg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}
          >
            Users ({users.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {users.map((u: VizUser) => (
              <div
                key={u.username}
                className="animate-card-appear"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: u.role === 'admin' ? 'var(--gradient-accent)' : 'var(--surface-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: u.role === 'admin' ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {u.role === 'admin' ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {u.name}
                    {u.role === 'admin' && (
                      <span
                        style={{
                          fontSize: '8px',
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          borderRadius: '99px',
                          background: 'rgba(124,92,252,0.15)',
                          color: 'var(--accent)',
                          border: '1px solid rgba(124,92,252,0.25)',
                        }}
                      >
                        Admin
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    @{u.username}
                  </div>
                </div>

                {/* Delete (not for admin) */}
                {u.role !== 'admin' && (
                  <button
                    onClick={() => handleDelete(u.username)}
                    title={confirmDelete === u.username ? 'Click again to confirm' : 'Delete user'}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: confirmDelete === u.username ? 'rgba(251,113,133,0.4)' : 'var(--border)',
                      background: confirmDelete === u.username ? 'var(--error-bg)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: confirmDelete === u.username ? 'var(--error)' : 'var(--text-muted)',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (confirmDelete !== u.username) {
                        (e.currentTarget as HTMLElement).style.color = 'var(--error)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,113,133,0.3)';
                        (e.currentTarget as HTMLElement).style.background = 'var(--error-bg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (confirmDelete !== u.username) {
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add user form */}
          {showAdd && (
            <div
              className="animate-slide-up"
              style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-bright)',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  fontFamily: "'Outfit', 'Inter', sans-serif",
                }}
              >
                Add New User
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Full name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
              </div>

              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '10px',
                    fontSize: '11.5px',
                    color: 'var(--error)',
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button
                  onClick={handleAdd}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '9px 16px', fontSize: '12.5px' }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add User
                </button>
                <button
                  onClick={() => { setShowAdd(false); setError(''); }}
                  className="btn-ghost"
                  style={{ padding: '9px 16px', fontSize: '12.5px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — add user button */}
        {!showAdd && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowAdd(true)}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px 24px', fontSize: '13px' }}
            >
              <UserPlus className="w-4 h-4" />
              Add New User
            </button>
          </div>
        )}
      </div>
    </>
  );
}
