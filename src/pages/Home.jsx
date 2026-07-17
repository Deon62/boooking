import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CITIES, MIN_RENTAL_DAYS, addDays } from '../data.js';
import { useCars } from '../cars.js';
import { CarCard, CarCardSkeleton } from '../components.jsx';
import { DateRangeCalendar, fmtShort } from '../Calendar.jsx';
import { CheckIcon, MapPinIcon } from '../icons.jsx';

export default function Home() {
  const { cars: allCars, loading, error } = useCars();
  const [city, setCity] = useState('All cities');
  const [pickup, setPickup] = useState(addDays(new Date(), 1));
  const [dropoff, setDropoff] = useState(addDays(new Date(), 1 + MIN_RENTAL_DAYS));
  const [calOpen, setCalOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setCalOpen(false);
        setCityOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const cars = useMemo(
    () => allCars.filter((car) => city === 'All cities' || car.city === city),
    [allCars, city]
  );

  const whenLabel =
    pickup && dropoff ? `${fmtShort(pickup)} – ${fmtShort(dropoff)}` : pickup ? `${fmtShort(pickup)} – ?` : 'Add dates';

  return (
    <div className="page">
      <div className="container wide">
        <div className="hero">
          <div className="searchbar-wrap" ref={wrapRef}>
            <div className="searchbar">
              <button
                type="button"
                className="search-field"
                onClick={() => {
                  setCityOpen((v) => !v);
                  setCalOpen(false);
                }}
              >
                <label style={{ cursor: 'pointer' }}>Where</label>
                <div className="value">{city}</div>
              </button>
              <button
                type="button"
                className="search-field"
                onClick={() => {
                  setCalOpen((v) => !v);
                  setCityOpen(false);
                }}
              >
                <label style={{ cursor: 'pointer' }}>When</label>
                <div className={`value${pickup ? '' : ' placeholder'}`}>{whenLabel}</div>
              </button>
              <button
                className="search-icon-btn"
                aria-label="Search"
                onClick={() => setCalOpen(false)}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <line x1="15.5" y1="15.5" x2="21" y2="21" />
                </svg>
              </button>
            </div>

            {cityOpen && (
              <div className="dd-pop">
                {CITIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`dd-item${c === city ? ' selected' : ''}`}
                    onClick={() => {
                      setCity(c);
                      setCityOpen(false);
                    }}
                  >
                    <span className="dd-label">
                      <MapPinIcon size={16} />
                      {c}
                    </span>
                    {c === city && <CheckIcon size={16} />}
                  </button>
                ))}
              </div>
            )}

            {calOpen && (
              <div className="cal-pop center">
                <DateRangeCalendar
                  start={pickup}
                  end={dropoff}
                  minDate={addDays(new Date(), 1)}
                  onChange={(s, e) => {
                    setPickup(s);
                    setDropoff(e);
                    if (s && e) setCalOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid">
            {Array.from({ length: 12 }, (_, i) => (
              <CarCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="empty">Couldn&apos;t load cars — {error}</div>
        ) : cars.length === 0 ? (
          <div className="empty">No cars in {city} yet — try another city.</div>
        ) : (
          <div className="grid">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
