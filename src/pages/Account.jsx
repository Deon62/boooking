import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { Avatar } from '../components.jsx';
import * as api from '../api.js';
import { UserIcon, IdCardIcon, CheckIcon, PhoneIcon, ShieldIcon } from '../icons.jsx';

function AccountLayout({ children }) {
  return (
    <div className="page">
      <div className="container wide">
        <div className="account-layout">
          <aside className="side-nav">
            <NavLink to="/profile" className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
              <UserIcon size={17} /> Profile
            </NavLink>
            <NavLink to="/license" className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
              <IdCardIcon size={17} /> Driver&apos;s licence
            </NavLink>
          </aside>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="control readonly">{value || '—'}</div>
    </div>
  );
}

export function Profile() {
  const { user } = useApp();
  return (
    <AccountLayout>
      <div className="cards-row">
        <div className="form-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 26 }}>
            <Avatar user={user} size={64} fontSize={22} />
            <div>
              <b style={{ fontSize: 18 }}>{user.fullName}</b>
              <div className="car-meta">
                Ardena member{user.memberSince ? ` since ${user.memberSince}` : ''}
              </div>
            </div>
          </div>
          <div className="two-col">
            <InfoRow label="Full name" value={user.fullName} />
            <InfoRow label="Mobile" value={user.phone} />
            <InfoRow label="ID number" value={user.idNumber} />
            <InfoRow label="Date of birth" value={user.dob} />
            <InfoRow label="Gender" value={user.gender} />
            <InfoRow label="Email" value={user.email} />
          </div>
        </div>

        <div className="form-card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>About</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14.5, minHeight: 42 }}>
            {user.bio || 'No bio yet.'}
          </p>
          <div className="notice" style={{ marginTop: 16 }}>
            To edit your details or photo, use the <b>Ardena app</b> → Profile. Web and app share
            one account, so changes appear here automatically.
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

const ID_TYPES = [
  { value: 'DRIVERS_LICENSE', label: 'Driving licence' },
  { value: 'NATIONAL_ID', label: 'National ID' },
  { value: 'PASSPORT', label: 'Passport' },
];

const KYC_POLL_MS = 8000;

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function License() {
  const { user } = useApp();
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  // Dojah widget session: { url } once verification has been started
  const [session, setSession] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [qrFailed, setQrFailed] = useState(false);
  // Optional ID confirmation (prefills the profile from the government registry)
  const [idType, setIdType] = useState('DRIVERS_LICENSE');
  const [idNumber, setIdNumber] = useState('');
  const [lookup, setLookup] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const pollRef = useRef(null);

  const refreshStatus = () =>
    api
      .getKycStatus()
      .then((data) => {
        setKyc(data);
        if (data.status === 'approved' || data.status === 'declined') {
          setSession(null);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
        return data;
      })
      .catch(() => null);

  useEffect(() => {
    refreshStatus().finally(() => setLoading(false));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll while the widget session is open or a decision is still pending.
  useEffect(() => {
    const shouldPoll = session || kyc?.status === 'pending';
    if (shouldPoll && !pollRef.current) {
      pollRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') refreshStatus();
      }, KYC_POLL_MS);
    }
    if (!shouldPoll && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, kyc?.status]);

  const confirmId = async () => {
    if (lookupBusy || !idNumber.trim()) return;
    setLookupBusy(true);
    setLookupError('');
    try {
      setLookup(await api.kycLookup(idType, idNumber.trim()));
    } catch (e) {
      setLookupError(e.message || 'ID not found. Please check the details.');
    } finally {
      setLookupBusy(false);
    }
  };

  const startVerification = async () => {
    if (starting) return;
    setStarting(true);
    setError('');
    try {
      const creds = await api.initializeKyc();
      setSession({ url: api.buildDojahUrl(creds) });
      setQrFailed(false);
    } catch (e) {
      setError(e.message || 'Could not start verification. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <AccountLayout>
        <div className="empty">Loading verification status…</div>
      </AccountLayout>
    );
  }

  const status = kyc?.status || 'not_started';
  const uploaded = Boolean(user.licenseDocumentUrl);

  return (
    <AccountLayout>
      {status === 'approved' ? (
        <div className="form-card" style={{ maxWidth: 640 }}>
          <div className="toggle-row" style={{ marginBottom: 18 }}>
            <div className="t-label">
              <b>Identity &amp; driver&apos;s licence</b>
              <span>Verified with a document scan and liveness check</span>
            </div>
            <span
              className="status-pill confirmed"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <CheckIcon size={13} /> Verified
            </span>
          </div>
          <div className="two-col">
            <InfoRow label="Verified name" value={kyc.verified_name} />
            <InfoRow label="Document" value={kyc.document_type} />
            <InfoRow label="Date of birth" value={kyc.verified_dob} />
            <InfoRow label="Verified on" value={fmtDate(kyc.verified_at)} />
          </div>
          <div className="notice">
            You&apos;re all set. Hosts see you as a verified driver, on web and in the app.
          </div>
        </div>
      ) : (
        <div className="form-card" style={{ maxWidth: 640 }}>
          <div className="toggle-row" style={{ marginBottom: 18 }}>
            <div className="t-label">
              <b>Verify your identity &amp; driver&apos;s licence</b>
              <span>Takes about 2 minutes. Required before your first self-drive trip</span>
            </div>
            <span
              className="status-pill pending"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              {status === 'pending' ? 'In review' : status === 'declined' ? 'Declined' : 'Not verified'}
            </span>
          </div>

          {status === 'declined' && (
            <div className="notice" style={{ marginTop: 0 }}>
              Your last attempt was declined
              {kyc?.decision_reason ? `: ${kyc.decision_reason}` : '.'} You can try again below.
            </div>
          )}

          {status === 'pending' && !session && (
            <div className="notice" style={{ marginTop: 0 }}>
              Your verification is being reviewed. This page updates automatically.
            </div>
          )}

          {/* Optional: confirm government ID to prefill the profile */}
          {!session && (
            <>
              <div className="field">
                <label>
                  Confirm your ID <span className="choose-hint">optional prefill</span>
                </label>
                <div className="two-col">
                  <div className="control">
                    <select value={idType} onChange={(e) => setIdType(e.target.value)}>
                      {ID_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="control">
                    <input
                      placeholder="ID number"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                    />
                  </div>
                </div>
                {lookup ? (
                  <p style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700, marginTop: 10 }}>
                    <CheckIcon size={13} /> Confirmed: {lookup.verified_name}
                  </p>
                ) : (
                  <button
                    className="neo-btn"
                    style={{ marginTop: 12 }}
                    disabled={lookupBusy || !idNumber.trim()}
                    onClick={confirmId}
                  >
                    {lookupBusy ? 'Checking…' : 'Confirm ID'}
                  </button>
                )}
                {lookupError && (
                  <p style={{ color: 'var(--error)', fontSize: 13, fontWeight: 700, marginTop: 10 }}>
                    {lookupError}
                  </p>
                )}
              </div>

              <button
                className="btn-primary btn-block"
                disabled={starting}
                onClick={startVerification}
              >
                {starting
                  ? 'Preparing verification…'
                  : status === 'pending'
                    ? 'Restart verification'
                    : 'Start verification'}
              </button>
            </>
          )}

          {session && (
            <div className="kyc-verify">
              <div className="kyc-qr">
                {!qrFailed ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=440x440&data=${encodeURIComponent(
                      session.url
                    )}`}
                    alt="Scan to verify on your phone"
                    onError={() => setQrFailed(true)}
                  />
                ) : (
                  <IdCardIcon size={44} style={{ color: 'var(--hint)' }} />
                )}
              </div>
              <div className="kyc-steps">
                <b>Scan with your phone camera</b>
                <p>
                  You&apos;ll scan your driver&apos;s licence and take a quick selfie video to
                  confirm it&apos;s really you.
                </p>
                <a
                  href={session.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neo-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <PhoneIcon size={15} /> On this phone? Verify now
                </a>
                <p className="kyc-waiting">
                  <ShieldIcon size={13} /> Waiting for your verification… this page updates
                  automatically.
                </p>
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--error)', fontSize: 13.5, fontWeight: 700, marginTop: 14 }}>
              {error}
            </p>
          )}

          <div className="notice" style={{ marginTop: 18 }}>
            {uploaded ? (
              <>
                A licence document is already on file from the app.{' '}
                <a className="link" href={user.licenseDocumentUrl} target="_blank" rel="noreferrer">
                  View document
                </a>
                . Verifying here adds the liveness check hosts trust most.
              </>
            ) : (
              <>Verification is powered by Dojah and syncs with the Ardena app.</>
            )}
          </div>
        </div>
      )}
    </AccountLayout>
  );
}
