import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatKES, DAMAGE_WAIVER_PRICE_PER_DAY } from '../data.js';
import { useCar, useCarRatings, ratingLabel, noteRecentlyViewed } from '../cars.js';
import { CarPhoto, BackButton } from '../components.jsx';
import { useApp } from '../store.jsx';
import { reportListing, listBookings } from '../api.js';
import {
  CogIcon,
  FuelIcon,
  UsersIcon,
  CalendarIcon,
  SteeringIcon,
  ShieldIcon,
  ChatIcon,
  FlagIcon,
  StarIcon,
  BanIcon,
  CheckIcon,
  MapPinIcon,
  CreditCardIcon,
} from '../icons.jsx';

// Same options as the app's ReportListingScreen.
const REPORT_REASONS = [
  "It's fraudulent",
  'Not a real car',
  'Incorrect or misleading details',
  'Inappropriate photos or content',
  'Car is unavailable or already rented',
  'Something else',
];

/** Report-a-listing flow: pick a reason, describe the issue, submit to moderation. */
function ReportListing({ carId }) {
  const { user } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  if (done) return <div className="notice">{done}</div>;

  if (!open) {
    return (
      <button
        className="report-link"
        onClick={() => {
          if (!user) navigate('/login', { state: { next: `/cars/${carId}` } });
          else setOpen(true);
        }}
      >
        <FlagIcon size={15} /> Report this listing
      </button>
    );
  }

  const submit = async () => {
    if (busy || !reason || !details.trim()) return;
    setBusy(true);
    setError('');
    try {
      await reportListing(carId, reason, details.trim());
      setDone('Thanks — your report was sent. Our team will review this listing.');
    } catch (e) {
      if (e.status === 429) setDone('You’ve already reported this listing — it’s with our team.');
      else setError(e.message || 'Couldn’t send the report. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="info-card report-card">
      <h3>Why are you reporting this listing?</h3>
      <div className="report-reasons">
        {REPORT_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            className={`report-reason${reason === r ? ' selected' : ''}`}
            onClick={() => setReason(r)}
          >
            {r}
            <span className="radio-dot" />
          </button>
        ))}
      </div>
      <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
        <label>Tell us more</label>
        <div className="control">
          <textarea
            maxLength={200}
            placeholder="Describe the issue (max 200 characters)…"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <div style={{ color: 'var(--error)', fontSize: 13.5, fontWeight: 700, marginTop: 10 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingBottom: 14 }}>
        <button
          className="btn-primary"
          disabled={busy || !reason || !details.trim()}
          onClick={submit}
        >
          {busy ? 'Sending…' : 'Send report'}
        </button>
        <button className="neo-btn" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const DEFAULT_RULES = [
  'No smoking in the car',
  'Return with the same fuel level',
  'Late returns are billed at an hourly rate',
  'Only verified drivers on the agreement may drive',
];

export default function CarDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();
  const { car, loading, error } = useCar(id);
  const ratings = useCarRatings(id);
  // Messaging unlocks only after a paid booking for this car.
  const [hasBooked, setHasBooked] = useState(false);

  useEffect(() => {
    if (car) noteRecentlyViewed(car.id);
  }, [car?.id]);

  useEffect(() => {
    if (!user || !car) {
      setHasBooked(false);
      return undefined;
    }
    let on = true;
    listBookings()
      .then((data) => {
        if (!on) return;
        setHasBooked(
          (data.bookings || []).some(
            (b) =>
              String(b.car_id) === car.id &&
              ['confirmed', 'active', 'completed'].includes(b.status)
          )
        );
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [user?.id, car?.id]);

  if (loading) {
    return (
      <div className="page container">
        <div className="empty">Loading car…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page container">
        <div className="empty">
          Couldn&apos;t load this car — {error}. <Link to="/">Back to browsing</Link>
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="page container">
        <div className="empty">
          Car not found. <Link to="/">Back to browsing</Link>
        </div>
      </div>
    );
  }

  const reviewCount = ratings.total;
  const currentYear = new Date().getFullYear();
  const yearsHosting = car.host.joined ? Math.max(1, currentYear - Number(car.host.joined)) : null;
  const hostFirstName = car.host.name.split(' ')[0];
  // Hosts write rules as free text, one per line; fall back to platform rules.
  const rules = car.rules
    ? car.rules.split('\n').map((r) => r.trim()).filter(Boolean)
    : DEFAULT_RULES;

  const startBooking = () => {
    if (!user) navigate('/login', { state: { next: `/book/${car.id}` } });
    else navigate(`/book/${car.id}`);
  };

  const messageHost = () => {
    navigate('/messages', {
      state: { hostId: car.host.id, hostName: car.host.name, carName: car.name },
    });
  };

  const specs = [
    { icon: <CogIcon size={20} />, label: 'Transmission', value: car.transmission },
    { icon: <FuelIcon size={20} />, label: 'Fuel', value: car.fuel },
    { icon: <UsersIcon size={20} />, label: 'Seats', value: `${car.seats} seats` },
    { icon: <CalendarIcon size={20} />, label: 'Year', value: String(car.year) },
    {
      icon: <SteeringIcon size={20} />,
      label: 'Drive options',
      value: car.driveTypes.map((t) => (t === 'self' ? 'Self drive' : 'Chauffeur')).join(' · '),
    },
    { icon: <MapPinIcon size={20} />, label: 'Pickup', value: `${car.locationName}, ${car.city}` },
  ];

  return (
    <div className="page">
      <div className="container">
        <BackButton to="/" />

        <div className="gallery5">
          <CarPhoto car={car} index={0} className="g-cell g-main" />
          <CarPhoto car={car} index={1} className="g-cell" />
          <CarPhoto car={car} index={2} className="g-cell" />
          <CarPhoto car={car} index={3} className="g-cell" />
          <CarPhoto car={car} index={4} className="g-cell" />
        </div>

        <div className="details-layout" style={{ marginTop: 30 }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>
              {car.name}
            </h1>
            <div className="rating-line">
              <StarIcon size={15} /> {ratingLabel(car)} · {reviewCount} review
              {reviewCount === 1 ? '' : 's'} · {car.locationName}, {car.city}
            </div>
            {car.description && (
              <p className="dashed-card car-desc">{car.description}</p>
            )}

            <div className="section">
              <h2>Specs</h2>
              <div className="spec-list">
                {specs.map((s) => (
                  <div className="spec-item" key={s.label}>
                    <span className="spec-icon">{s.icon}</span>
                    <div>
                      <span className="spec-label">{s.label}</span>
                      <b>{s.value}</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section host-duo">
              <div>
                <h2>Meet your host</h2>
                <div className="host-panel">
                  <span className="avatar" style={{ width: 68, height: 68, fontSize: 24 }}>
                    {car.host.avatarUrl ? (
                      <img src={car.host.avatarUrl} alt={car.host.name} />
                    ) : (
                      car.host.name[0]
                    )}
                  </span>
                  <b className="host-name">{car.host.name}</b>
                  {car.host.joined && (
                    <span className="car-meta">Host since {car.host.joined}</span>
                  )}
                  <div className="host-stats">
                    <div>
                      <b>
                        {ratingLabel(car)} <StarIcon size={12} />
                      </b>
                      <span>Rating</span>
                    </div>
                    <div>
                      <b>{reviewCount}</b>
                      <span>Reviews</span>
                    </div>
                    <div>
                      <b>{yearsHosting ? `${yearsHosting} yr${yearsHosting > 1 ? 's' : ''}` : '—'}</b>
                      <span>Hosting</span>
                    </div>
                  </div>
                  <button
                    className="neo-btn host-msg"
                    disabled={!hasBooked}
                    onClick={messageHost}
                  >
                    <ChatIcon size={16} /> Message {hostFirstName}
                  </button>
                  {!hasBooked && (
                    <span className="host-msg-hint">Unlocks after you book this car</span>
                  )}
                </div>
              </div>

              <div>
                <h2>Rental details</h2>
                <div className="info-card">
                  <div className="info-row">
                    <span>
                      <CreditCardIcon size={17} /> Price per day
                    </span>
                    <b>{formatKES(car.pricePerDay)}</b>
                  </div>
                  <div className="info-row">
                    <span>
                      <CalendarIcon size={17} /> Minimum rental
                    </span>
                    <b>
                      {car.minRentalDays} day{car.minRentalDays > 1 ? 's' : ''}
                    </b>
                  </div>
                  <div className="info-row">
                    <span>
                      <UsersIcon size={17} /> Minimum driver age
                    </span>
                    <b>{car.minAge} years</b>
                  </div>
                  <div className="info-row">
                    <span>
                      <SteeringIcon size={17} /> Drive options
                    </span>
                    <b>{car.driveTypes.map((t) => (t === 'self' ? 'Self drive' : 'Chauffeur')).join(' · ')}</b>
                  </div>
                  {car.deposit != null && (
                    <div className="info-row">
                      <span>
                        <ShieldIcon size={17} /> Refundable deposit
                      </span>
                      <b>{formatKES(car.deposit)}</b>
                    </div>
                  )}
                  <div className="info-row">
                    <span>
                      <MapPinIcon size={17} /> Pickup point
                    </span>
                    <b>{car.locationName}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="section">
              <h2>Car rules</h2>
              <div className="info-card">
                {rules.map((r) => (
                  <div className="info-row rule" key={r}>
                    <span>
                      <BanIcon size={16} /> {r}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <h2>Protection</h2>
              <div className="info-card">
                <div className="info-row">
                  <span>
                    <ShieldIcon size={17} /> Comprehensive insurance
                  </span>
                  <b>
                    <CheckIcon size={16} style={{ color: 'var(--success)' }} /> Included
                  </b>
                </div>
                <div className="info-row">
                  <span>
                    <ShieldIcon size={17} /> Damage waiver (optional)
                  </span>
                  <b>{formatKES(DAMAGE_WAIVER_PRICE_PER_DAY)}/day</b>
                </div>
                <p className="info-note">
                  The optional damage waiver reduces your liability for accidental damage during the
                  trip. You can add it at checkout.
                </p>
              </div>
            </div>

            <div className="section">
              <h2>Cancellation policy</h2>
              <div className="info-card">
                <div className="info-row">
                  <span>
                    <CheckIcon size={16} style={{ color: 'var(--success)' }} /> Free cancellation up
                    to 48 hours before pickup
                  </span>
                </div>
                <div className="info-row">
                  <span>
                    <BanIcon size={16} /> 50% refund between 48 and 24 hours before pickup
                  </span>
                </div>
                <div className="info-row">
                  <span>
                    <BanIcon size={16} /> No refund within 24 hours of pickup
                  </span>
                </div>
              </div>
            </div>

            <div className="section">
              <h2>Reviews</h2>
              {ratings.loading ? (
                <p style={{ color: 'var(--text-2)' }}>Loading reviews…</p>
              ) : ratings.reviews.length === 0 ? (
                <div className="dashed-card reviews-empty">
                  <span className="reviews-empty-icon">
                    <StarIcon size={22} />
                  </span>
                  <b>No reviews yet</b>
                  <p>Be the first to rent it and share how the trip went.</p>
                </div>
              ) : (
                ratings.reviews.map((r, i) => (
                  <div className="review" key={i}>
                    <div className="r-head">
                      {r.name} <span>{r.date}</span>
                    </div>
                    <p>{r.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="section">
              <ReportListing carId={car.id} />
            </div>
          </div>

          <aside className="book-widget">
            <div className="price-line">
              {formatKES(car.pricePerDay)} <span>/ day</span>
            </div>
            <div className="widget-rows">
              <div className="widget-row">
                <span>Minimum rental</span>
                <b>
                  {car.minRentalDays} day{car.minRentalDays > 1 ? 's' : ''}
                </b>
              </div>
              <div className="widget-row">
                <span>Minimum age</span>
                <b>{car.minAge} years</b>
              </div>
              <div className="widget-row">
                <span>Rating</span>
                <b>
                  <StarIcon size={12} /> {ratingLabel(car)} ({reviewCount})
                </b>
              </div>
            </div>
            <button className="btn-primary btn-block" onClick={startBooking}>
              Reserve
            </button>
            <p className="widget-foot">You won&apos;t be charged until you confirm payment.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
