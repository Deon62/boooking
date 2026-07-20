import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CITIES, MIN_RENTAL_DAYS, addDays } from '../data.js';
import { useCars } from '../cars.js';
import { CarCard, CarCardSkeleton } from '../components.jsx';
import { DateRangeCalendar, fmtShort } from '../Calendar.jsx';
import { CheckIcon, MapPinIcon } from '../icons.jsx';
import emptyVideo from '../assets/empty.webm';

const SHELF_SIZE = 6;

/** Partition the catalogue into clean rows of six, each with a psychology-led
 * title. Cars are pulled from a shrinking pool by each shelf's theme, so every
 * car appears in exactly one section (no repeats) and the last shelf simply
 * keeps whatever's left. Built on fields that actually vary (year, seats,
 * price) — ratings/favourites are still empty upstream. */
function buildShelves(cars) {
  const pool = [...cars];
  const take = (sorter) => {
    pool.sort(sorter);
    return pool.splice(0, Math.min(SHELF_SIZE, pool.length));
  };

  const shelves = [];
  const add = (key, title, sub, list) => {
    if (list.length) shelves.push({ key, title, sub, cars: list });
  };

  add('fresh', 'Just landed', 'The newest cars on Ardena, fresh this week',
    take((a, b) => b.year - a.year));
  add('crew', 'Room for the whole crew', 'Seven seats and up for the whole group',
    take((a, b) => b.seats - a.seats || a.pricePerDay - b.pricePerDay));
  add('premium', 'Make an entrance', 'Premium picks for the days that matter',
    take((a, b) => b.pricePerDay - a.pricePerDay));
  add('budget', 'More car, less cash', 'Easy on the wallet, big on value',
    take((a, b) => a.pricePerDay - b.pricePerDay));
  add('trusted', 'Everyday favourites', 'Dependable rides drivers come back to', pool.splice(0));

  return shelves;
}

function CarShelf({ title, sub, cars }) {
  return (
    <section className="shelf">
      <div className="shelf-head">
        <h2 className="shelf-title">{title}</h2>
        {sub && <p className="shelf-sub">{sub}</p>}
      </div>
      <div className="grid shelf-cards">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
    </section>
  );
}

function ShelfSkeleton() {
  return (
    <section className="shelf" aria-hidden="true">
      <div className="shelf-head">
        <div className="skel-line" style={{ width: 200, height: 20, marginTop: 0 }} />
        <div className="skel-line" style={{ width: 260, height: 12 }} />
      </div>
      <div className="grid shelf-cards">
        {Array.from({ length: SHELF_SIZE }, (_, i) => (
          <CarCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

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

  const shelves = useMemo(() => buildShelves(cars), [cars]);

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
          <>
            <ShelfSkeleton />
            <ShelfSkeleton />
          </>
        ) : error ? (
          <div className="empty">Couldn&apos;t load cars — {error}</div>
        ) : cars.length === 0 ? (
          <div className="empty-state">
            <video className="empty-anim" src={emptyVideo} autoPlay loop muted playsInline />
            <b>No cars in {city} just yet</b>
            <p>
              We&apos;re signing up verified hosts across Kenya all the time. Try another city or
              take a look at the whole fleet.
            </p>
            {city !== 'All cities' && (
              <button className="btn-primary" onClick={() => setCity('All cities')}>
                Show cars in all cities
              </button>
            )}
          </div>
        ) : (
          <>
            {shelves.map((s) => (
              <CarShelf key={s.key} title={s.title} sub={s.sub} cars={s.cars} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
