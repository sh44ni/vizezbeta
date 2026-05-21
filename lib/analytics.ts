'use client';

import { useEffect, useRef, useCallback } from 'react';

function generateSessionToken(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

const SESSION_KEY = 'vizez_analytics_session';
const HEARTBEAT_INTERVAL = 60000; // 60 seconds

interface TrackOptions {
  user_email?: string;
  user_name?: string;
  metadata?: Record<string, unknown>;
}

async function sendTrackEvent(event_type: string, options: TrackOptions = {}) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type,
        user_email: options.user_email,
        user_name: options.user_name,
        metadata: options.metadata || {},
      }),
    });
  } catch {
    // Silent fail — analytics should never break the app
  }
}

async function startSession(user_email: string, user_name?: string): Promise<string> {
  const token = generateSessionToken();
  try {
    sessionStorage.setItem(SESSION_KEY, token);
  } catch {}

  try {
    await fetch('/api/analytics/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email, user_name, session_token: token }),
    });
  } catch {}

  return token;
}

async function heartbeat(token: string, page?: string) {
  try {
    await fetch('/api/analytics/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: token, page }),
    });
  } catch {}
}

async function endSession(token: string) {
  try {
    await fetch(`/api/analytics/session?token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
  } catch {}
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function useAnalytics(user?: { email: string; name: string } | null) {
  const sessionTokenRef = useRef<string | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Start session on mount (if user is logged in)
  useEffect(() => {
    if (!user?.email) return;

    let token: string | null = null;
    try {
      token = sessionStorage.getItem(SESSION_KEY);
    } catch {}

    if (!token) {
      startSession(user.email, user.name).then(t => {
        sessionTokenRef.current = t;
      });
    } else {
      sessionTokenRef.current = token;
    }

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      if (sessionTokenRef.current) {
        heartbeat(sessionTokenRef.current, window.location.pathname);
      }
    }, HEARTBEAT_INTERVAL);

    // End session on tab close
    const handleUnload = () => {
      if (sessionTokenRef.current) {
        // Use sendBeacon to notify server about session end
        const data = JSON.stringify({ session_token: sessionTokenRef.current, action: 'end' });
        try {
          navigator.sendBeacon('/api/analytics/session', data);
        } catch {
          // Fallback: fire and forget
          endSession(sessionTokenRef.current);
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [user?.email, user?.name]);

  // Track function for custom events
  const track = useCallback((eventType: string, metadata?: Record<string, unknown>) => {
    sendTrackEvent(eventType, {
      user_email: user?.email,
      user_name: user?.name,
      metadata,
    });
  }, [user?.email, user?.name]);

  // Track page view
  const trackPageView = useCallback((page: string) => {
    sendTrackEvent('page_view', {
      user_email: user?.email,
      user_name: user?.name,
      metadata: { page },
    });
  }, [user?.email, user?.name]);

  // End session explicitly (on logout)
  const endCurrentSession = useCallback(() => {
    if (sessionTokenRef.current) {
      endSession(sessionTokenRef.current);
      sessionTokenRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
  }, []);

  return { track, trackPageView, endCurrentSession };
}

// Standalone track function for use outside React components
export { sendTrackEvent as trackEvent };
