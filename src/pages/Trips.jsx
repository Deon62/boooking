import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatKES } from '../data.js';
import { fmtShort } from '../Calendar.jsx';
import { mapBooking } from '../cars.js';
import { CarPhoto } from '../components.jsx';
import { listBookings } from '../api.js';
import { MapPinIcon, ChevronRightIcon } from '../icons.jsx';

function TripSkeleton() {
  return (
    <div className="trip-card" aria-hidden="true">
      <div className="pic img-skel" style={{ position: 'relative' }} />
      <div className="trip-main">
        <div className="skel-line" style={{ width: '38%', marginTop: 0 }} />
        <div className="skel-line" style={{ width: '55%' }} />
      </div>
      <div className="skel-line" style={{ width: 90, marginTop: 0 }} />
    </div>
  );
}

export default function Trips() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">My trips</h1>
        <p className="page-sub">Bookings made on the web and in the Ardena app appear here.</p>

        {loading ? (
          <>
            <TripSkeleton />
            <TripSkeleton />
          </>
        ) : error ? (
          <div className="empty">{error}</div>
        ) : bookings.length === 0 ? (
          <div className="empty">
            No trips yet — <Link to="/">book your first car</Link>.
          </div>
        ) : (
          bookings.map((b) => (
            <Link to={`/trips/${b.id}`} className="trip-card" key={b.id}>
              <CarPhoto car={b.car} className="pic" />
              <div className="trip-main">
                <div className="trip-title">
                  <b>{b.car.name}</b>
                  <span className={`status-pill ${b.status}`}>{b.status}</span>
                </div>
                <div className="trip-dates">
                  {fmtShort(b.pickupDate)} → {fmtShort(b.dropoffDate)} · {b.days} day
                  {b.days === 1 ? '' : 's'}
                </div>
                <div className="trip-meta">
                  <MapPinIcon size={13} /> {b.pickupLocation} ·{' '}
                  {b.driveType === 'self' ? 'Self drive' : 'Chauffeur'}
                </div>
              </div>
              <div className="trip-end">
                <b>{formatKES(b.total)}</b>
                <span className="trip-code">{b.id}</span>
              </div>
              <span className="trip-chev">
                <ChevronRightIcon size={18} />
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
