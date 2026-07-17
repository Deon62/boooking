import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatKES, formatDateLong } from '../data.js';
import { mapBooking, useCar, useCarRatings, ratingLabel } from '../cars.js';
import { CarPhoto, BackButton } from '../components.jsx';
import { getBooking, cancelBooking, downloadReceipt, getHandoverCodes } from '../api.js';
import {
  CalendarIcon,
  MapPinIcon,
  SteeringIcon,
  CreditCardIcon,
  ShieldIcon,
  ChatIcon,
  StarIcon,
  PhoneIcon,
  IdCardIcon,
  CheckIcon,
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

/** Two-sided handover codes, shown for upcoming/active trips (same as the app). */
function HandoverCard({ bookingId }) {
  const [codes, setCodes] = useState(null);

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

  const phase = (label, p) => (
    <div className="info-row">
      <span>
        <IdCardIcon size={17} /> {label}
      </span>
      {p.state === 'available' && p.code ? (
        <b className="handover-code">{p.code}</b>
      ) : (
        <b style={{ color: 'var(--hint)' }}>
          {p.state === 'used' ? 'Used' : 'Unlocks closer to time'}
        </b>
      )}
    </div>
  );

  return (
    <div className="section">
      <h2>Handover codes</h2>
      <div className="info-card">
        {phase('Pickup code', codes.pickup)}
        {phase('Return code', codes.return)}
        <p className="info-note">
          Share the pickup code with your host at handover, and the return code when you bring the
          car back — same codes as in the app.
        </p>
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
  const yearsHosting = host.joined
    ? Math.max(1, new Date().getFullYear() - Number(host.joined))
    : null;
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
    <div className="page">
      <div className="container">
        <BackButton to="/trips" />

        {photos.length > 0 && (
          <div className="trip-gallery">
            <CarPhoto car={galleryCar} index={0} className="g-cell g-main" />
            <CarPhoto car={galleryCar} index={1} className="g-cell" />
            <CarPhoto car={galleryCar} index={2} className="g-cell" />
          </div>
        )}

        <div className="details-layout" style={{ marginTop: 26 }}>
          <div>
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

            <HandoverCard bookingId={booking.id} />

            <div className="section">
              <h2>Your host</h2>
              <div className="host-panel">
                <span className="avatar" style={{ width: 68, height: 68, fontSize: 24 }}>
                  {host.avatarUrl ? <img src={host.avatarUrl} alt={host.name} /> : host.name[0]}
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
                    <b>{yearsHosting ? `${yearsHosting} yr${yearsHosting > 1 ? 's' : ''}` : '—'}</b>
                    <span>Hosting</span>
                  </div>
                </div>
                <button className="neo-btn host-msg" onClick={messageHost}>
                  <ChatIcon size={16} /> Message {hostFirstName}
                </button>
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
                ) : (
                  <button
                    className="neo-btn danger-btn btn-block"
                    style={{ width: '100%' }}
                    onClick={() => setConfirmCancel(true)}
                  >
                    Cancel trip
                  </button>
                )}
                <p className="widget-foot" style={{ marginTop: 14 }}>
                  <CheckIcon size={13} style={{ color: 'var(--success)' }} /> Full refund until 24
                  hours before pickup, 50% after that.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
