import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatKES } from '../data.js';
import { fmtShort } from '../Calendar.jsx';
import { mapBooking, useCars } from '../cars.js';
import { CarPhoto } from '../components.jsx';
import { listBookings, deleteBookingRecord } from '../api.js';
import { MapPinIcon, SteeringIcon, ClockIcon, HeartIcon, CalendarIcon } from '../icons.jsx';

const PAST = ['completed', 'cancelled', 'rejected'];

export default function Trips() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { cars: allCars } = useCars();

  useEffect(() => {
    let on = true;
    listBookings()
      .then((data) => {
        if (on) setBookings((data.bookings || []).map(mapBooking));
      })
      .catch((e) => {
        if (on) setError(e.message || 'Couldn’t load your trips.');
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, []);

  const removeTrip = async (id) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteBookingRecord(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      setConfirmId(null);
    } catch (e) {
      setError(e.message || 'Couldn’t delete this trip.');
    } finally {
      setDeleting(false);
    }
  };

  // "You would also love": top-rated cars the renter hasn't booked yet.
  const bookedCarIds = new Set(bookings.map((b) => b.car.id));
  const suggestions = allCars
    .filter((c) => !bookedCarIds.has(c.id))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 1240 }}>
        <div className="trips-layout">
          <div>
            <div className="wl-chip neutral">
              <ClockIcon size={15} /> Past trips
              {!loading && bookings.length > 0 && (
                <span className="wl-count">{bookings.length}</span>
              )}
            </div>

            {loading ? (
              <div className="past-panel">
                <div className="past-row" aria-hidden="true">
                  <div className="pic img-skel" style={{ position: 'relative' }} />
                  <div className="past-main">
                    <div className="skel-line" style={{ width: '45%', marginTop: 0 }} />
                    <div className="skel-line" style={{ width: '65%' }} />
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="empty">{error}</div>
            ) : bookings.length === 0 ? (
              <p className="trips-none">
                No trips yet. <Link to="/">Browse cars</Link> to book your first one.
              </p>
            ) : (
              <div className="past-panel">
                {bookings.map((b) => {
                  const isPast = PAST.includes(b.status);
                  return (
                    <div className="past-row" key={b.id}>
                      <CarPhoto car={b.car} className="pic" />
                      <div className="past-main">
                        <b>{b.car.name}</b>
                        <span>
                          <CalendarIcon size={13} /> {fmtShort(b.pickupDate)} →{' '}
                          {fmtShort(b.dropoffDate)}
                        </span>
                        <span>
                          <MapPinIcon size={13} /> {b.pickupLocation}
                        </span>
                        <span>
                          <SteeringIcon size={13} />{' '}
                          {b.driveType === 'self' ? 'Self drive' : 'With chauffeur'}
                        </span>
                      </div>
                      <div className="past-side">
                        <span className={`status-pill ${b.status}`}>{b.status}</span>
                        <b className="past-total">{formatKES(b.total)}</b>
                        <span className="past-days">
                          {b.days} day{b.days === 1 ? '' : 's'} trip
                        </span>
                        <div className="past-actions">
                          {confirmId === b.id ? (
                            <>
                              <button
                                className="neo-btn btn-sm danger-btn"
                                disabled={deleting}
                                onClick={() => removeTrip(b.id)}
                              >
                                {deleting ? 'Deleting…' : 'Yes, delete'}
                              </button>
                              <button
                                className="neo-btn btn-sm"
                                disabled={deleting}
                                onClick={() => setConfirmId(null)}
                              >
                                Keep
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="neo-btn btn-sm"
                                onClick={() => navigate(`/trips/${b.id}`)}
                              >
                                View
                              </button>
                              {isPast && (
                                <button
                                  className="neo-btn btn-sm danger-btn"
                                  onClick={() => setConfirmId(b.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="wl-chip">
              <HeartIcon filled size={15} /> You would also love
            </div>
            <div className="love-panel">
              {suggestions.length === 0 ? (
                <p className="trips-none" style={{ margin: 0 }}>
                  Loading suggestions…
                </p>
              ) : (
                suggestions.map((car) => (
                  <Link to={`/cars/${car.id}`} className="love-item" key={car.id}>
                    <CarPhoto car={car} className="pic" />
                    <span className="love-text">
                      <b>{car.name}</b>
                      <span>{formatKES(car.pricePerDay)}/day</span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
