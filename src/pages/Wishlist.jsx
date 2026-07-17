import React from 'react';
import { Link } from 'react-router-dom';
import { useCars } from '../cars.js';
import { CarCard, CarCardSkeleton } from '../components.jsx';
import { useApp } from '../store.jsx';

export default function Wishlist() {
  const { wishlist } = useApp();
  const { cars: allCars, loading } = useCars();
  const cars = allCars.filter((c) => wishlist.has(c.id));

  return (
    <div className="page">
      <div className="container wide">
        <h1 className="page-title">Wishlist</h1>
        <p className="page-sub">Cars you&apos;ve saved — synced with the Ardena app.</p>

        {loading ? (
          <div className="grid">
            {Array.from({ length: 4 }, (_, i) => (
              <CarCardSkeleton key={i} />
            ))}
          </div>
        ) : cars.length === 0 ? (
          <div className="empty">
            <p>
              Nothing saved yet — tap the heart on any car while{' '}
              <Link to="/" className="link">
                browsing
              </Link>
              .
            </p>
          </div>
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
