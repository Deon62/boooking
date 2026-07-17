import React, { useEffect, useState } from 'react';
import * as api from '../api.js';
import { MastercardMark } from '../components.jsx';
import mpesaImg from '../assets/mpesa.png';
import { ShieldIcon } from '../icons.jsx';

function formatMpesaNumber(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length >= 12) return `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  return raw || '';
}

/** A saved method rendered as a real-looking debit card. */
function DebitCard({ m }) {
  const isMpesa = m.method_type === 'mpesa';
  const brand = (m.card_type || '').toLowerCase();
  const skin = isMpesa ? 'mpesa' : brand === 'visa' ? 'visa' : 'dark';

  return (
    <div className={`debit-card ${skin}`}>
      <div className="dc-top">
        <span className="dc-chip" />
        {m.is_default && <span className="dc-default">Default</span>}
      </div>
      <div className="dc-number">
        {isMpesa
          ? formatMpesaNumber(m.mpesa_number)
          : m.card_last_four
            ? `•••• •••• •••• ${m.card_last_four}`
            : '•••• •••• •••• ••••'}
      </div>
      <div className="dc-bottom">
        <div className="dc-meta">
          <span>{isMpesa ? 'Mobile money' : 'Cardholder'}</span>
          <b>{m.name || (isMpesa ? 'M-Pesa' : 'Card')}</b>
        </div>
        {m.expiry_date && (
          <div className="dc-meta">
            <span>Expires</span>
            <b>{m.expiry_date}</b>
          </div>
        )}
        <span className="dc-brand">
          {isMpesa ? (
            <span className="dc-brand-chip">
              <img src={mpesaImg} alt="M-Pesa" />
            </span>
          ) : brand === 'mastercard' ? (
            <MastercardMark height={26} />
          ) : (
            <span className="dc-visa">VISA</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function Payments() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    });

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 1020 }}>
        <h1 className="page-title">Payment methods</h1>
        <p className="page-sub">Used for bookings on web and in the Ardena app.</p>

        <div className="pm-layout">
          <div>
            {loading ? (
              <div className="dc-grid">
                <div className="debit-card img-skel" style={{ position: 'relative' }} />
                <div className="debit-card img-skel" style={{ position: 'relative' }} />
              </div>
            ) : methods.length === 0 ? (
              <p className="pm-empty">
                No saved methods yet. Add your M-Pesa number below, or just pay at checkout and
                we&apos;ll save it for next time.
              </p>
            ) : (
              <div className="dc-grid">
                {methods.map((m) => (
                  <div key={m.id}>
                    <DebitCard m={m} />
                    <div className="dc-actions">
                      {!m.is_default && (
                        <button
                          className="link"
                          disabled={busy}
                          onClick={() => run(() => api.setDefaultPaymentMethod(m.id))}
                        >
                          Make default
                        </button>
                      )}
                      <button
                        className="link"
                        style={{ color: 'var(--error)' }}
                        disabled={busy}
                        onClick={() => run(() => api.deletePaymentMethod(m.id))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="form-card" style={{ marginTop: 26 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Add an M-Pesa number</label>
                <div className="pm-add-row">
                  <div className="control" style={{ flex: 1 }}>
                    <input
                      type="tel"
                      placeholder="+254 7XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn-primary"
                    disabled={busy || phone.replace(/\D/g, '').length < 9}
                    onClick={addMpesa}
                  >
                    {busy ? 'Saving…' : 'Save number'}
                  </button>
                </div>
                <p className="info-note" style={{ paddingBottom: 0 }}>
                  Cards are added automatically the first time you pay by card. Card details are
                  entered on Paystack&apos;s secure page, never here.
                </p>
              </div>
              {error && (
                <div style={{ color: 'var(--error)', fontSize: 13.5, fontWeight: 700, marginTop: 12 }}>
                  {error}
                </div>
              )}
            </div>
          </div>

          <aside className="pm-info">
            <h3>How payments work</h3>
            <p>
              You pay when you book, by M-Pesa STK push or card on Paystack&apos;s secure page.
              Ardena holds the money and only releases it to the host after pickup. Refundable
              deposits come back to you after the trip.
            </p>
            <hr />
            <h3>Spotted something off?</h3>
            <p>
              Report anything suspicious to{' '}
              <a href="mailto:support@ardena.co.ke">support@ardena.co.ke</a> or call{' '}
              <a href="tel:+254702248984">+254 702 248 984</a>.
            </p>
            <div className="pm-never">
              <ShieldIcon size={17} />
              <span>
                Ardena will <b>never</b> call or text asking for your M-Pesa PIN, card details or
                password. If anyone does, they are not us. Report them right away.
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
