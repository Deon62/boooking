import React, { useEffect, useState } from 'react';
import * as api from '../api.js';
import { Toggle } from '../components.jsx';
import { BellIcon, CheckIcon } from '../icons.jsx';

function timeAgo(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr${Math.floor(s / 3600) > 1 ? 's' : ''} ago`;
  if (s < 172800) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('unread');
  const [busy, setBusy] = useState(false);
  // Notification preferences (synced with the app via the profile)
  const [prefs, setPrefs] = useState(null);
  const [prefBusy, setPrefBusy] = useState('');

  useEffect(() => {
    let on = true;
    Promise.all([api.getNotifications().catch(() => null), api.getMe().catch(() => null)])
      .then(([nots, me]) => {
        if (!on) return;
        if (nots) setItems(nots.notifications || []);
        if (me) {
          setPrefs({
            email: me.email_notifications_enabled !== false,
            inApp: me.in_app_notifications_enabled !== false,
          });
        }
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, []);

  const unread = items.filter((n) => !n.is_read);
  const read = items.filter((n) => n.is_read);
  const shown = tab === 'unread' ? unread : read;

  const openNotification = (n) => {
    if (n.is_read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    api.markNotificationRead(n.id).catch(() => {});
  };

  const markAll = async () => {
    if (busy || unread.length === 0) return;
    setBusy(true);
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    await Promise.all(unread.map((n) => api.markNotificationRead(n.id).catch(() => {})));
    setBusy(false);
  };

  const togglePref = async (key) => {
    if (!prefs || prefBusy) return;
    const next = !prefs[key];
    setPrefBusy(key);
    setPrefs((p) => ({ ...p, [key]: next }));
    try {
      if (key === 'email') await api.setEmailNotifications(next);
      else await api.setInAppNotifications(next);
    } catch {
      setPrefs((p) => ({ ...p, [key]: !next }));
    } finally {
      setPrefBusy('');
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 1340 }}>
        <div className="nots-layout">
          <div className="form-card nots-card">
            <div className="nots-head">
              <div className="nots-tabs">
                <button
                  className={`nots-tab${tab === 'unread' ? ' active' : ''}`}
                  onClick={() => setTab('unread')}
                >
                  Unread{unread.length > 0 && <span className="wl-count">{unread.length}</span>}
                </button>
                <button
                  className={`nots-tab${tab === 'read' ? ' active' : ''}`}
                  onClick={() => setTab('read')}
                >
                  Read
                </button>
              </div>
              <button
                className="neo-btn"
                disabled={busy || unread.length === 0}
                onClick={markAll}
                style={{ padding: '9px 18px', fontSize: 13 }}
              >
                Mark all as read
              </button>
            </div>

            {loading ? (
              <>
                <div className="skel-line" style={{ width: '70%', height: 40, borderRadius: 12 }} />
                <div className="skel-line" style={{ width: '60%', height: 40, borderRadius: 12 }} />
              </>
            ) : shown.length === 0 ? (
              <div className="nots-empty">
                <span className="reviews-empty-icon">
                  {tab === 'unread' ? <CheckIcon size={22} /> : <BellIcon size={22} />}
                </span>
                <b>{tab === 'unread' ? 'You’re all caught up' : 'Nothing here yet'}</b>
                <p>
                  {tab === 'unread'
                    ? 'New booking updates and announcements will land here.'
                    : 'Notifications you’ve read will appear here.'}
                </p>
              </div>
            ) : (
              shown.map((n) => (
                <button className="not-row" key={n.id} onClick={() => openNotification(n)}>
                  <span className={`not-dot${n.is_read ? ' read' : ''}`} />
                  <span className="not-main">
                    <b>{n.title}</b>
                    <span>{n.message}</span>
                  </span>
                  <span className="not-side">
                    {n.notification_type && <em className="not-type">{n.notification_type}</em>}
                    <span className="not-time">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>

          <aside className="form-card nots-settings">
            <h3>Notification settings</h3>
            <div className="toggle-row">
              <div className="t-label">
                <b>Email notifications</b>
                <span>Booking updates and receipts to your inbox</span>
              </div>
              <Toggle
                on={prefs ? prefs.email : true}
                onChange={() => togglePref('email')}
              />
            </div>
            <div className="toggle-row">
              <div className="t-label">
                <b>In-app notifications</b>
                <span>Alerts here and in the Ardena app</span>
              </div>
              <Toggle
                on={prefs ? prefs.inApp : true}
                onChange={() => togglePref('inApp')}
              />
            </div>
            <p className="info-note" style={{ paddingBottom: 0 }}>
              Preferences apply across web and the Ardena app.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
