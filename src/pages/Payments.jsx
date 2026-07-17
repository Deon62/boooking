import React, { useEffect, useState } from 'react';
import * as api from '../api.js';
import { PhoneIcon, CreditCardIcon, PlusIcon } from '../icons.jsx';

function methodDetail(m) {
  if (m.method_type === 'mpesa') return m.mpesa_number || '';
  if (m.card_last_four) {
    return `•••• ${m.card_last_four}${m.expiry_date ? ` · exp ${m.expiry_date}` : ''}`;
  }
  return 'Entered securely on Paystack at checkout';
}

export default function Payments() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    api
      .listPaymentMethods()
      .then((data) => setMethods(data.payment_methods || []))
      .catch((e) => setError(e.message || 'Couldn’t load payment methods.'));

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const addMpesa = () =>
    run(async () => {
      await api.addMpesaMethod('M-Pesa', phone.replace(/\D/g, ''));
      setPhone('');
      setAdding(false);
    });

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 620 }}>
        <h1 className="page-title">Payment methods</h1>
        <p className="page-sub">Used for bookings on web and in the Ardena app.</p>

        <div className="form-card">
          {loading ? (
            <>
              <div className="skel-line" style={{ width: '80%', height: 52, borderRadius: 14 }} />
              <div className="skel-line" style={{ width: '80%', height: 52, borderRadius: 14 }} />
            </>
          ) : methods.length === 0 && !adding ? (
            <p style={{ color: 'var(--text-2)', fontSize: 14.5, marginBottom: 12 }}>
              No payment methods yet — add one below, or just pay at checkout and we&apos;ll save it
              for next time.
            </p>
          ) : (
            methods.map((m) => (
              <div className="pay-method static" key={m.id} style={{ cursor: 'default' }}>
                <span className="icon">
                  {m.method_type === 'mpesa' ? <PhoneIcon size={21} /> : <CreditCardIcon size={21} />}
                </span>
                <span style={{ flex: 1 }}>
                  {m.name || (m.method_type === 'mpesa' ? 'M-Pesa' : 'Card')}
                  <span className="sub">{methodDetail(m)}</span>
                </span>
                {m.is_default ? (
                  <span className="status-pill confirmed" style={{ color: 'var(--primary)' }}>
                    Default
                  </span>
                ) : (
                  <button
                    className="link"
                    style={{ fontSize: 12.5, fontWeight: 700 }}
                    disabled={busy}
                    onClick={() => run(() => api.setDefaultPaymentMethod(m.id))}
                  >
                    Make default
                  </button>
                )}
                <button
                  className="link"
                  style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--error)' }}
                  disabled={busy}
                  onClick={() => run(() => api.deletePaymentMethod(m.id))}
                >
                  Remove
                </button>
              </div>
            ))
          )}

          {adding && (
            <div className="field" style={{ marginTop: 8 }}>
              <label>M-Pesa phone number</label>
              <div className="control">
                <input
                  type="tel"
                  placeholder="+254 7XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <button
                className="btn-primary btn-block"
                style={{ marginTop: 12 }}
                disabled={busy || phone.replace(/\D/g, '').length < 9}
                onClick={addMpesa}
              >
                {busy ? 'Saving…' : 'Save M-Pesa number'}
              </button>
            </div>
          )}

          {!adding && !loading && (
            <button className="btn-google" style={{ marginTop: 8 }} onClick={() => setAdding(true)}>
              <PlusIcon size={17} />
              Add M-Pesa number
            </button>
          )}

          {error && (
            <div style={{ color: 'var(--error)', fontSize: 13.5, fontWeight: 700, marginTop: 12 }}>
              {error}
            </div>
          )}

          <div className="notice">
            Cards are entered on <b>Paystack&apos;s secure page</b> during checkout — we never see
            or store card numbers.
          </div>
        </div>
      </div>
    </div>
  );
}
