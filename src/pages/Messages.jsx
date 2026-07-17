import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as api from '../api.js';
import { SendIcon, ChatIcon } from '../icons.jsx';

// Real client↔host chat — same conversations as the Ardena app.
// The backend has no websocket; like the app we fetch on open/send,
// plus a light poll while the page is visible.

const POLL_MS = 15000;

function fmtMsgTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

function mapConversation(c) {
  return {
    hostId: c.host_id,
    hostName: c.host_name || 'Ardena host',
    hostAvatar: c.host_avatar_url,
    unread: !c.is_read_by_client,
    lastMessageAt: c.last_message_at,
    startedAt: c.created_at,
    messages: (c.messages || []).map((m) => ({
      id: m.id,
      from: m.sender_type === 'client' ? 'me' : 'host',
      text: m.message,
      time: fmtMsgTime(m.created_at),
    })),
  };
}

function HostAvatar({ thread, size = 40, fontSize }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: fontSize || Math.round(size * 0.4) }}
    >
      {thread.hostAvatar && !failed ? (
        <img src={thread.hostAvatar} alt={thread.hostName} onError={() => setFailed(true)} />
      ) : (
        thread.hostName[0]
      )}
    </span>
  );
}

export default function Messages() {
  const { state } = useLocation();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeHostId, setActiveHostId] = useState(state?.hostId ?? null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bodyRef = useRef(null);
  const tempIdRef = useRef(-1);

  /** Merge fresh conversations, preserving avatars the single endpoint omits. */
  const adoptConversations = useCallback((list) => {
    setThreads((prev) => {
      const prevByHost = new Map(prev.map((t) => [t.hostId, t]));
      return list.map((t) => ({
        ...t,
        hostAvatar: t.hostAvatar || prevByHost.get(t.hostId)?.hostAvatar || null,
      }));
    });
  }, []);

  const refresh = useCallback(async () => {
    const data = await api.getConversations();
    let list = (data.conversations || []).map(mapConversation);
    // Coming from "Message host" for a host with no thread yet — start one.
    if (state?.hostId && !list.some((t) => t.hostId === state.hostId)) {
      try {
        const conv = await api.getConversationWithHost(state.hostId);
        list = [mapConversation(conv), ...list];
      } catch {
        /* host gone — just show existing threads */
      }
    }
    adoptConversations(list);
    return list;
  }, [state?.hostId, adoptConversations]);

  // Initial load
  useEffect(() => {
    let on = true;
    refresh()
      .then((list) => {
        if (!on) return;
        if (activeHostId == null && list.length) setActiveHostId(list[0].hostId);
      })
      .catch((e) => {
        if (on) setError(e.message || 'Couldn’t load your messages.');
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Light poll while the tab is visible, so host replies appear like in the app.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') refresh().catch(() => {});
    };
    const timer = setInterval(tick, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Opening a thread marks the host's messages as read (server-side too).
  const openThread = (hostId) => {
    setActiveHostId(hostId);
    setThreads((prev) => prev.map((t) => (t.hostId === hostId ? { ...t, unread: false } : t)));
    api
      .getConversationWithHost(hostId)
      .then((conv) => {
        const mapped = mapConversation(conv);
        setThreads((prev) =>
          prev.map((t) =>
            t.hostId === hostId
              ? { ...mapped, hostAvatar: mapped.hostAvatar || t.hostAvatar }
              : t
          )
        );
      })
      .catch(() => {});
  };

  const thread = threads.find((t) => t.hostId === activeHostId) || threads[0] || null;

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [thread?.messages.length, activeHostId]);

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !thread || sending) return;
    setSending(true);
    setDraft('');
    const tempId = tempIdRef.current--;
    const optimistic = { id: tempId, from: 'me', text, time: fmtMsgTime(new Date().toISOString()) };
    setThreads((prev) =>
      prev.map((t) =>
        t.hostId === thread.hostId ? { ...t, messages: [...t.messages, optimistic] } : t
      )
    );
    try {
      const sent = await api.sendMessageToHost(thread.hostId, text);
      setThreads((prev) =>
        prev.map((t) =>
          t.hostId === thread.hostId
            ? {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === tempId
                    ? { id: sent.id, from: 'me', text: sent.message, time: fmtMsgTime(sent.created_at) }
                    : m
                ),
              }
            : t
        )
      );
    } catch (err) {
      // Roll back the optimistic message and restore the draft
      setThreads((prev) =>
        prev.map((t) =>
          t.hostId === thread.hostId
            ? { ...t, messages: t.messages.filter((m) => m.id !== tempId) }
            : t
        )
      );
      setDraft(text);
      setError(err.message || 'Couldn’t send the message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="page container wide">
        <div className="empty">Loading messages…</div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="page container wide">
        <div className="empty">
          {error || (
            <>
              No conversations yet — message a host from any{' '}
              <Link to="/" className="link">
                car page
              </Link>
              .
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container wide">
        <div className="msg-layout">
          <div className="msg-list">
            {threads.map((t) => (
              <button
                key={t.hostId}
                className={`msg-item${t.hostId === thread.hostId ? ' active' : ''}`}
                onClick={() => openThread(t.hostId)}
              >
                <HostAvatar thread={t} />
                <span className="msg-item-text">
                  <b>
                    {t.hostName}
                    {t.unread && <span className="unread-dot" />}
                  </b>
                  <span className={t.unread ? 'unread-preview' : undefined}>
                    {t.messages.length
                      ? t.messages[t.messages.length - 1].text
                      : 'New conversation'}
                  </span>
                </span>
                <span className="msg-item-time">{fmtMsgTime(t.lastMessageAt)}</span>
              </button>
            ))}
          </div>

          <div className="msg-thread">
            <div className="msg-head">
              <HostAvatar thread={thread} size={30} fontSize={13} />
              <b>{thread.hostName}</b>
              {state?.carName && state?.hostId === thread.hostId && (
                <span className="car-meta"> · {state.carName}</span>
              )}
            </div>
            <div className="msg-body" ref={bodyRef}>
              {thread.messages.length === 0 ? (
                <div className="empty" style={{ padding: '40px 20px' }}>
                  Say hello to {thread.hostName}
                </div>
              ) : (
                thread.messages.map((m) => (
                  <div key={m.id} className={`bubble ${m.from === 'me' ? 'me' : 'host'}`}>
                    {m.text}
                    <span className="bubble-time">{m.time}</span>
                  </div>
                ))
              )}
            </div>
            {error && (
              <div style={{ color: 'var(--error)', fontSize: 13, fontWeight: 700, padding: '6px 18px' }}>
                {error}
              </div>
            )}
            <form className="msg-input" onSubmit={send}>
              <div className="control" style={{ flex: 1 }}>
                <input
                  placeholder={`Message ${thread.hostName}…`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="search-icon-btn"
                style={{ margin: 0 }}
                aria-label="Send"
                disabled={sending}
              >
                <SendIcon size={18} />
              </button>
            </form>
          </div>

          <aside className="msg-side">
            <HostAvatar thread={thread} size={96} fontSize={34} />
            <b style={{ fontSize: 15.5, textAlign: 'center' }}>{thread.hostName}</b>
            <div className="car-meta" style={{ textAlign: 'center' }}>
              Ardena host
              {thread.startedAt
                ? ` · chatting since ${new Date(thread.startedAt).toLocaleDateString('en-KE', {
                    month: 'short',
                    year: 'numeric',
                  })}`
                : ''}
            </div>
            <div className="notice" style={{ marginTop: 16, fontSize: 12.5 }}>
              <ChatIcon size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Messages sync with the Ardena app — your host sees them there too.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
