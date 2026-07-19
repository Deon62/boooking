import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatKES, formatDateLong } from '../data.js';
import { SingleDateCalendar } from '../Calendar.jsx';
import {
  mapBooking,
  useCar,
  useCarRatings,
  ratingLabel,
  hostingDuration,
  useHostAvatar,
} from '../cars.js';
import { CarPhoto, BackButton } from '../components.jsx';
import {
  getBooking,
  cancelBooking,
  getCancellationPreview,
  downloadReceipt,
  getHandoverCodes,
  refreshHandoverCode,
  listExtensions,
  requestExtension,
  payExtension,
  listPaymentMethods,
  addMpesaMethod,
  getPaymentStatus,
} from '../api.js';
import {
  CalendarIcon,
  MapPinIcon,
  SteeringIcon,
  CreditCardIcon,
  ShieldIcon,
  ChatIcon,
  StarIcon,
  PhoneIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  RefreshIcon,
} from '../icons.jsx';

const DEPOSIT_STATUS_LABEL = {
  held: 'held until after the trip',
  pending_release: 'being released',
  released: 'refunded',
  partial_refund: 'partially refunded',
  forfeited: 'forfeited',
};

function fmtBookedOn(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtUnlockTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** One handover phase tile: big code + copy + "new code", or the locked/used state. */
function HandoverPhase({ label, hint, phase, accent, onRefresh, refreshing }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(phase.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — code is visible anyway */
    }
  };

  return (
    <div className={`handover-tile ${accent}`}>
      <span className="handover-label">
        <i className="handover-dot" /> {label}
      </span>
      {phase.state === 'available' && phase.code ? (
        <>
          <b className="handover-big">
            {phase.code.slice(0, 3)} {phase.code.slice(3)}
          </b>
          <div className="handover-actions">
            <button className="handover-link" onClick={copy}>
              {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />} {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="handover-link" onClick={onRefresh} disabled={refreshing}>
              <RefreshIcon size={13} /> {refreshing ? 'Getting…' : 'New code'}
            </button>
          </div>
        </>
      ) : phase.state === 'used' ? (
        <b className="handover-state used">
          <CheckIcon size={15} /> Used
        </b>
      ) : (
        <b className="handover-state">
          <ClockIcon size={15} />{' '}
          {phase.unlocks_at ? `Unlocks ${fmtUnlockTime(phase.unlocks_at)}` : hint}
        </b>
      )}
    </div>
  );
}

/**
 * Two-sided handover codes, shown for upcoming/active trips (same as the app).
 * Pickup code unlocks 24h before pickup; return code unlocks once the trip is
 * active. "New code" invalidates the previous one server-side.
 */
function HandoverCard({ bookingId }) {
  const [codes, setCodes] = useState(null);
  const [refreshing, setRefreshing] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let on = true;
    getHandoverCodes(bookingId)
      .then((data) => {
        if (on) setCodes(data);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [bookingId]);

  if (!codes || !codes.requires_handover_code) return null;

  const refresh = async (phase) => {
    if (refreshing) return;
    setRefreshing(phase);
    setError('');
    try {
      const result = await refreshHandoverCode(bookingId, phase);
      setCodes((prev) => {
        const key = phase === 'pickup' ? 'pickup' : 'return';
        return { ...prev, [key]: { ...prev[key], state: result.state, code: result.code } };
      });
    } catch (e) {
      setError(e.message || 'Couldn’t get a new code. Please try again.');
    } finally {
      setRefreshing('');
    }
  };

  return (
    <div className="section">
      <h2>Handover codes</h2>
      <div className="handover-grid">
        <HandoverPhase
          label="Pickup code"
          hint="Unlocks 24h before pickup"
          phase={codes.pickup}
          accent="pickup"
          onRefresh={() => refresh('pickup')}
          refreshing={refreshing === 'pickup'}
        />
        <HandoverPhase
          label="Return code"
          hint="Unlocks once you pick up the car"
          phase={codes.return}
          accent="return"
          onRefresh={() => refresh('return')}
          refreshing={refreshing === 'return'}
        />
      </div>
      <p className="info-note" style={{ paddingTop: 12 }}>
        Give the pickup code to your host when collecting the car, and the return code when you
        bring it back — same codes as in the app. Getting a new code cancels the old one.
      </p>
      {error && <p className="info-note" style={{ color: 'var(--error)' }}>{error}</p>}
    </div>
  );
}

// ---------- trip extensions ----------

const EXT_STATUS = {
  pending_host_approval: { pill: 'pending', label: 'awaiting host' },
  host_approved: { pill: 'confirmed', label: 'approved' },
  paid: { pill: 'active', label: 'paid' },
  rejected: { pill: 'rejected', label: 'rejected' },
  expired: { pill: 'cancelled', label: 'expired' },
};

const EXT_POLL_INTERVAL_MS = 3500;
const EXT_POLL_TRIES = 40; // ~2.3 minutes of STK polling

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return '254' + digits.slice(1);
  return '254' + digits;
}

/** Adds `days` to a YYYY-MM-DD string (local time — toISOString would shift a day in UTC+3). */
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(fromStr, toStr) {
  return Math.round(
    (new Date(toStr + 'T00:00:00') - new Date(fromStr + 'T00:00:00')) / 86_400_000
  );
}

/**
 * Keep-the-car-longer flow: request a later drop-off → host approves →
 * pay the extra days by M-Pesa (must be 24h+ before the current drop-off).
 */
function ExtendTripCard({ booking, onBookingUpdate }) {
  const [extensions, setExtensions] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [calOpen, setCalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState('');
  const [payPhase, setPayPhase] = useState('idle'); // idle | working | waiting
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const reload = () =>
    listExtensions(booking.id)
      .then((data) => setExtensions(data.extensions || []))
      .catch(() => setExtensions([]));

  useEffect(() => {
    let on = true;
    listExtensions(booking.id)
      .then((data) => {
        if (on) setExtensions(data.extensions || []);
      })
      .catch(() => {
        if (on) setExtensions([]);
      });
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id]);

  useEffect(() => {
    // Prefill with the client's default M-Pesa number for the approved-extension payment.
    listPaymentMethods()
      .then((data) => {
        const methods = data?.payment_methods || data?.methods || data || [];
        const mpesa = Array.isArray(methods)
          ? methods.filter((m) => m.method_type === 'mpesa')
          : [];
        const preferred = mpesa.find((m) => m.is_default) || mpesa[0];
        if (preferred?.mpesa_number) setPhone(preferred.mpesa_number);
      })
      .catch(() => {});
  }, []);

  if (extensions === null) return null;

  const active = extensions.find((e) =>
    ['pending_host_approval', 'host_approved'].includes(e.status)
  );
  const history = extensions.filter((e) => e !== active);

  const minDate = addDays(booking.dropoffDate, 1);
  const extraDays = newDate ? Math.max(0, daysBetween(booking.dropoffDate, newDate)) : 0;
  const perDay = booking.dailyRate + (booking.damageWaiver ? booking.waiver / booking.days : 0);
  const estimate = extraDays * perDay;

  const submitRequest = async () => {
    if (submitting || !newDate || extraDays < 1) return;
    setSubmitting(true);
    setError('');
    setNote('');
    try {
      // Keep the original drop-off time so the backend counts whole extra days.
      const time = String(booking.endsAtISO || '').slice(11, 19) || '10:00:00';
      await requestExtension(booking.id, `${newDate}T${time}`);
      setNewDate('');
      setNote('Extension requested — we’ll notify you when the host responds.');
      await reload();
    } catch (e) {
      setError(e.message || 'Couldn’t request the extension. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const payApproved = async () => {
    if (payPhase !== 'idle' || !active) return;
    setError('');
    setNote('');
    setPayPhase('working');
    try {
      const number = normalizePhone(phone);
      if (number.length < 12) throw new Error('Enter a valid M-Pesa number.');
      const data = await listPaymentMethods().catch(() => null);
      const methods = data?.payment_methods || data?.methods || data || [];
      const match = Array.isArray(methods)
        ? methods.find(
            (m) => m.method_type === 'mpesa' && normalizePhone(m.mpesa_number) === number
          )
        : null;
      const methodId = match ? match.id : (await addMpesaMethod('M-Pesa', number)).id;

      const result = await payExtension(booking.id, active.id, methodId);
      setPayPhase('waiting');
      setNote('STK push sent. Enter your M-Pesa PIN on your phone to pay.');

      for (let i = 0; i < EXT_POLL_TRIES; i++) {
        await new Promise((r) => setTimeout(r, EXT_POLL_INTERVAL_MS));
        let status;
        try {
          status = await getPaymentStatus({ checkout_request_id: result.transaction_id });
        } catch {
          continue; // transient — keep polling
        }
        if (status.status === 'completed') {
          setNote('Extension paid — your drop-off has been moved.');
          setPayPhase('idle');
          await reload();
          const fresh = await getBooking(booking.id).catch(() => null);
          if (fresh) onBookingUpdate(fresh);
          return;
        }
        if (status.status === 'failed' || status.status === 'cancelled') {
          throw new Error(status.message || `Payment ${status.status}. You can try again.`);
        }
      }
      throw new Error('We haven’t received the payment confirmation yet. You can try again.');
    } catch (e) {
      setNote('');
      setError(e.message || 'Payment failed. Please try again.');
      setPayPhase('idle');
    }
  };

  const extRow = (e) => {
    const s = EXT_STATUS[e.status] || { pill: 'pending', label: e.status };
    return (
      <div className="info-row" key={e.id}>
        <span>
          <CalendarIcon size={17} /> Until {formatDateLong(String(e.requested_end_date).slice(0, 10))} ·{' '}
          {e.extra_days} extra day{e.extra_days === 1 ? '' : 's'}
        </span>
        <b>
          {formatKES(e.extra_amount)} <span className={`status-pill ${s.pill}`}>{s.label}</span>
        </b>
      </div>
    );
  };

  return (
    <div className="section">
      <h2>Keep the car longer</h2>
      <div className="info-card">
        {active && extRow(active)}
        {history.map(extRow)}

        {active?.status === 'pending_host_approval' && (
          <p className="info-note">
            Waiting for your host to approve. You’ll pay {formatKES(active.extra_amount)} once
            they do.
          </p>
        )}

        {active?.status === 'host_approved' && (
          <>
            <div className="ext-pay">
              <div className="ext-phone">
                <PhoneIcon size={16} />
                <input
                  type="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={payPhase !== 'idle'}
                />
              </div>
              <button
                className="btn-primary ext-pay-btn"
                onClick={payApproved}
                disabled={payPhase !== 'idle'}
              >
                {payPhase === 'working'
                  ? 'Starting…'
                  : payPhase === 'waiting'
                    ? 'Waiting for M-Pesa…'
                    : `Pay ${formatKES(active.extra_amount)}`}
              </button>
            </div>
            <p className="info-note">
              Host approved! Pay by M-Pesa at least 24 hours before your current drop-off to
              confirm the extra days.
            </p>
          </>
        )}

        {!active && (
          <>
            <div className="ext-pay">
              <button
                className="ext-date-btn"
                onClick={() => setCalOpen((v) => !v)}
                disabled={submitting}
              >
                <CalendarIcon size={16} />
                {newDate ? `New drop-off · ${formatDateLong(newDate)}` : 'Pick a new drop-off date'}
              </button>
              <button
                className="btn-primary ext-pay-btn"
                onClick={submitRequest}
                disabled={submitting || !newDate || extraDays < 1}
              >
                {submitting
                  ? 'Requesting…'
                  : extraDays >= 1
                    ? `Request ${extraDays} extra day${extraDays === 1 ? '' : 's'} · ${formatKES(estimate)}`
                    : 'Request extension'}
              </button>
            </div>
            {calOpen && (
              <div className="ext-cal">
                <SingleDateCalendar
                  value={newDate}
                  minDate={minDate}
                  onChange={(d) => {
                    setNewDate(d);
                    setCalOpen(false);
                  }}
                />
              </div>
            )}
            <p className="info-note">
              Pick a new drop-off date. Your host approves first, then you pay{' '}
              {formatKES(perDay)}/day for the extra days — same rate as this trip.
            </p>
          </>
        )}

        {note && (
          <p className="info-note" style={{ color: 'var(--success)', fontWeight: 700 }}>
            {note}
          </p>
        )}
        {error && (
          <p className="info-note" style={{ color: 'var(--error)', fontWeight: 700 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelPreview, setCancelPreview] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let on = true;
    getBooking(id)
      .then((data) => {
        if (on) setBooking(mapBooking(data));
      })
      .catch(() => {})
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, [id]);

  // Live listing — brings the host avatar/joined-year and current price for rebooking.
  const { car: liveCar } = useCar(booking?.car.id || '');
  const ratings = useCarRatings(booking?.car.id || '');
  const hostAvatar = useHostAvatar(
    liveCar?.host.id || booking?.car.host.id,
    liveCar?.host.avatarUrl
  );

  if (loading) {
    return (
      <div className="page container">
        <div className="empty">Loading trip…</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="page container">
        <div className="empty">
          Trip not found. <Link to="/trips">Back to my trips</Link>
        </div>
      </div>
    );
  }

  const photos = booking.car.photos.length ? booking.car.photos : liveCar?.photos || [];
  const galleryCar = { ...booking.car, photos };
  const host = liveCar?.host || booking.car.host;
  const hostFirstName = host.name.split(' ')[0];
  const hosting = hostingDuration(liveCar?.host.createdAt);
  const cancellable = ['pending', 'confirmed'].includes(booking.status);
  const paid = ['confirmed', 'active', 'completed'].includes(booking.status);
  const bookedOn = fmtBookedOn(booking.createdAt);
  const depositLabel = DEPOSIT_STATUS_LABEL[booking.depositStatus];

  const messageHost = () =>
    navigate('/messages', {
      state: {
        hostId: host.id || booking.car.host.id,
        hostName: host.name,
        carName: booking.car.name,
      },
    });

  // Fetch the live refund preview when the confirm box opens — the widget then
  // shows the exact amount instead of the generic policy line.
  const openCancel = () => {
    setConfirmCancel(true);
    setCancelPreview(null);
    getCancellationPreview(booking.id)
      .then(setCancelPreview)
      .catch(() => setCancelPreview(false));
  };

  const doCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setError('');
    try {
      const result = await cancelBooking(booking.id);
      setBooking(mapBooking(result));
      setConfirmCancel(false);
      if (result.refund_eligible && result.refund_amount > 0) {
        setCancelNote(
          `Trip cancelled. A refund of ${formatKES(result.refund_amount)} is on its way.`
        );
      } else {
        setCancelNote('Trip cancelled.');
      }
    } catch (e) {
      setError(e.message || 'Couldn’t cancel the trip. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const getReceipt = async () => {
    if (receiptBusy) return;
    setReceiptBusy(true);
    setError('');
    try {
      await downloadReceipt(booking.id);
    } catch (e) {
      setError(e.message || 'Couldn’t download the receipt. Please try again.');
    } finally {
      setReceiptBusy(false);
    }
  };

  return (
    <div className="page trip-detail">
      <div className="container">
        <BackButton to="/trips" />

        <div className="details-layout" style={{ marginTop: 26 }}>
          <div>
            <div className="trip-head dashed-card">
              <CarPhoto car={galleryCar} className="trip-head-pic" />
              <div className="trip-head-main">
                <div className="trip-title" style={{ gap: 14 }}>
                  <h1 className="page-title" style={{ marginBottom: 0 }}>
                    {booking.car.name}
                  </h1>
                  <span className={`status-pill ${booking.status}`}>{booking.status}</span>
                </div>
                <div className="rating-line" style={{ marginTop: 6 }}>
                  <span className="trip-code">{booking.id}</span>
                  {bookedOn && <> · Booked on {bookedOn}</>}
                </div>
              </div>
            </div>

            {cancelNote && (
              <div className="notice" style={{ marginTop: 16 }}>
                {cancelNote}
              </div>
            )}
            {booking.status === 'cancelled' && !cancelNote && (
              <div className="notice" style={{ marginTop: 16 }}>
                This trip was cancelled
                {booking.cancellationReason ? ` — ${booking.cancellationReason}` : '.'}
                {booking.refundPolicyReason ? ` ${booking.refundPolicyReason}` : ''}
              </div>
            )}

            <div className="section">
              <h2>Trip details</h2>
              <div className="info-card">
                <div className="info-row">
                  <span>
                    <CalendarIcon size={17} /> Pickup
                  </span>
                  <b>
                    {formatDateLong(booking.pickupDate)}
                    {booking.pickupTime ? ` · ${booking.pickupTime}` : ''}
                  </b>
                </div>
                <div className="info-row">
                  <span>
                    <CalendarIcon size={17} /> Drop-off
                  </span>
                  <b>
                    {formatDateLong(booking.dropoffDate)}
                    {booking.dropoffTime ? ` · ${booking.dropoffTime}` : ''}
                  </b>
                </div>
                <div className="info-row">
                  <span>
                    <MapPinIcon size={17} /> Pickup point
                  </span>
                  <b>{booking.pickupLocation}</b>
                </div>
                <div className="info-row">
                  <span>
                    <MapPinIcon size={17} /> Return point
                  </span>
                  <b>{booking.dropoffLocation}</b>
                </div>
                <div className="info-row">
                  <span>
                    <SteeringIcon size={17} /> Drive type
                  </span>
                  <b>{booking.driveType === 'self' ? 'Self drive' : 'Chauffeur'}</b>
                </div>
                {booking.checkIn && (
                  <div className="info-row">
                    <span>
                      <PhoneIcon size={17} /> Check-in
                    </span>
                    <b>{booking.checkIn === 'self' ? 'Self check-in' : 'Assisted by host'}</b>
                  </div>
                )}
                {booking.notes && (
                  <p className="info-note">Special requirements: {booking.notes}</p>
                )}
              </div>
            </div>

            {['pending', 'confirmed', 'active'].includes(booking.status) && (
              <HandoverCard bookingId={booking.id} />
            )}

            {['confirmed', 'active'].includes(booking.status) && (
              <ExtendTripCard
                booking={booking}
                onBookingUpdate={(fresh) => setBooking(mapBooking(fresh))}
              />
            )}

            <div className="section">
              <h2>Your host</h2>
              <div className="host-panel">
                <span className="avatar" style={{ width: 68, height: 68, fontSize: 24 }}>
                  {hostAvatar ? <img src={hostAvatar} alt={host.name} /> : host.name[0]}
                </span>
                <b className="host-name">{host.name}</b>
                {host.joined && <span className="car-meta">Host since {host.joined}</span>}
                <div className="host-stats">
                  <div>
                    <b>
                      {liveCar ? ratingLabel(liveCar) : '—'} <StarIcon size={12} />
                    </b>
                    <span>Rating</span>
                  </div>
                  <div>
                    <b>{ratings.total}</b>
                    <span>Reviews</span>
                  </div>
                  <div>
                    <b>{hosting || '—'}</b>
                    <span>Hosting</span>
                  </div>
                </div>
                <button className="neo-btn host-msg" disabled={!paid} onClick={messageHost}>
                  <ChatIcon size={16} /> Message {hostFirstName}
                </button>
                {!paid && (
                  <span className="host-msg-hint">Unlocks once the booking is paid</span>
                )}
              </div>
            </div>

            <div className="section">
              <h2>Payment</h2>
              <div className="info-card">
                <div className="info-row">
                  <span>
                    <CreditCardIcon size={17} /> {formatKES(booking.dailyRate)} × {booking.days}{' '}
                    day{booking.days === 1 ? '' : 's'}
                  </span>
                  <b>{formatKES(booking.subtotal)}</b>
                </div>
                {booking.damageWaiver && (
                  <div className="info-row">
                    <span>
                      <ShieldIcon size={17} /> Damage waiver
                    </span>
                    <b>{formatKES(booking.waiver)}</b>
                  </div>
                )}
                {booking.deposit > 0 && (
                  <div className="info-row">
                    <span>
                      <ShieldIcon size={17} /> Deposit{depositLabel ? ` (${depositLabel})` : ''}
                    </span>
                    <b>{formatKES(booking.deposit)}</b>
                  </div>
                )}
                <div className="info-row">
                  <span>Total</span>
                  <b style={{ fontSize: 15.5 }}>{formatKES(booking.total)}</b>
                </div>
                {booking.depositStatus === 'partial_refund' && booking.depositRefunded != null && (
                  <p className="info-note">
                    {formatKES(booking.depositRefunded)} of the deposit was refunded.
                  </p>
                )}
              </div>
            </div>

            {paid && (
              <div className="section">
                <h2>Receipt</h2>
                <div className="info-card receipt-card">
                  <div className="info-row" style={{ borderTop: 'none' }}>
                    <span>
                      <CreditCardIcon size={17} /> PDF with booking, payment and host details
                    </span>
                    <button className="neo-btn" onClick={getReceipt} disabled={receiptBusy}>
                      {receiptBusy ? 'Preparing…' : 'Download receipt'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--error)', fontSize: 13.5, fontWeight: 700, marginTop: 16 }}>
                {error}
              </div>
            )}
          </div>

          <aside className="side-sticky">
            <div className="book-widget rebook-card">
              <CarPhoto car={galleryCar} className="pic" />
              <b className="rebook-name">{booking.car.name}</b>
              {liveCar ? (
                <>
                  <div className="rating-line" style={{ justifyContent: 'center' }}>
                    <StarIcon size={13} /> {ratingLabel(liveCar)} · {liveCar.locationName}
                  </div>
                  <div className="price-line" style={{ marginTop: 10 }}>
                    {formatKES(liveCar.pricePerDay)} <span>/ day</span>
                  </div>
                  <Link to={`/book/${liveCar.id}`} className="btn-primary btn-block">
                    Book again
                  </Link>
                  <Link
                    to={`/cars/${liveCar.id}`}
                    className="link"
                    style={{ fontSize: 13.5, textAlign: 'center', display: 'block', marginTop: 12 }}
                  >
                    View listing
                  </Link>
                </>
              ) : (
                <>
                  <p className="car-meta" style={{ textAlign: 'center', margin: '8px 0 14px' }}>
                    This car is no longer listed.
                  </p>
                  <Link to="/" className="btn-primary btn-block">
                    Browse similar cars
                  </Link>
                </>
              )}
            </div>

            {cancellable && (
              <div className="book-widget" style={{ marginTop: 20 }}>
                {confirmCancel ? (
                  <>
                    <div className="cancel-confirm" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                      <span>Cancel this trip?</span>
                      <button className="neo-btn danger-btn" onClick={doCancel} disabled={cancelling}>
                        {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                      </button>
                      <button
                        className="neo-btn"
                        onClick={() => setConfirmCancel(false)}
                        disabled={cancelling}
                      >
                        Keep trip
                      </button>
                    </div>
                    <p className="widget-foot" style={{ marginTop: 14 }}>
                      {cancelPreview === null ? (
                        'Checking your refund…'
                      ) : cancelPreview && cancelPreview.refund_eligible && cancelPreview.refund_amount > 0 ? (
                        <>
                          <CheckIcon size={13} style={{ color: 'var(--success)' }} /> You’ll be
                          refunded {formatKES(cancelPreview.refund_amount)}
                          {cancelPreview.refund_percentage != null &&
                            ` (${Math.round(cancelPreview.refund_percentage * 100)}%)`}
                          .
                        </>
                      ) : cancelPreview ? (
                        cancelPreview.refund_policy_reason ||
                        'No refund applies if you cancel now.'
                      ) : (
                        'Full refund until 24 hours before pickup, 50% after that.'
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      className="neo-btn danger-btn btn-block"
                      style={{ width: '100%' }}
                      onClick={openCancel}
                    >
                      Cancel trip
                    </button>
                    <p className="widget-foot" style={{ marginTop: 14 }}>
                      <CheckIcon size={13} style={{ color: 'var(--success)' }} /> Full refund until
                      24 hours before pickup, 50% after that.
                    </p>
                  </>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
