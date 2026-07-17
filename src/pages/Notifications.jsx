import React from 'react';
import { CheckIcon, CalendarIcon, CreditCardIcon, ChatIcon } from '../icons.jsx';

const NOTIFICATIONS = [
  {
    icon: <CheckIcon size={18} />,
    color: 'var(--success)',
    title: 'Booking confirmed',
    body: 'Your Honda Fit 2018 booking (ARD-4F7K2Q) was confirmed.',
    time: '2 May 2026',
  },
  {
    icon: <CalendarIcon size={18} />,
    color: 'var(--primary)',
    title: 'Pickup reminder',
    body: 'Pickup tomorrow at 10:00 — Section 58 (Ngata), Nakuru.',
    time: '1 May 2026',
  },
  {
    icon: <CreditCardIcon size={18} />,
    color: 'var(--primary)',
    title: 'Payment received',
    body: 'We received KES 12,200 via M-Pesa for booking ARD-4F7K2Q.',
    time: '28 Apr 2026',
  },
  {
    icon: <ChatIcon size={18} />,
    color: 'var(--warning)',
    title: 'New message',
    body: 'James K. sent you a message about your upcoming trip.',
    time: '28 Apr 2026',
  },
];

export default function Notifications() {
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 620 }}>
        <h1 className="page-title">Notifications</h1>
        <p className="page-sub">Booking updates, reminders and messages.</p>
        <div className="form-card" style={{ padding: '14px 20px' }}>
          {NOTIFICATIONS.map((n, i) => (
            <div className="notif-row" key={i}>
              <span className="notif-icon" style={{ color: n.color }}>
                {n.icon}
              </span>
              <div className="notif-text">
                <b>{n.title}</b>
                <span>{n.body}</span>
              </div>
              <span className="notif-time">{n.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
