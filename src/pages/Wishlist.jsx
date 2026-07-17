import React from 'react';
import { Link } from 'react-router-dom';
import { formatKES } from '../data.js';
import { useCars, getRecentlyViewed } from '../cars.js';
import { CarCard, CarCardSkeleton, CarPhoto } from '../components.jsx';
import { useApp } from '../store.jsx';
import { HeartIcon, HeartOutlineIcon, ClockIcon } from '../icons.jsx';

export default function Wishlist() {
  const { wishlist } = useApp();
  const { cars, loading } = useCars();

  const liked = cars.filter((c) => wishlist.has(c.id));
  const likedIds = new Set(liked.map((c) => c.id));
  const recent = getRecentlyViewed()
    .map((id) => cars.find((c) => c.id === id))
    .filter(Boolean)
    .filter((c) => !likedIds.has(c.id))
    .slice(0, 6);

  return (
    <div className="page">
      <div className="container wide">
        <div className="wl-chip">
          <HeartIcon filled size={15} /> Liked
          {!loading && <span className="wl-count">{liked.length}</span>}
        </div>

        {loading ? (
          <div className="grid">
            {Array.from({ length: 4 }, (_, i) => (
              <CarCardSkeleton key={i} />
            ))}
          </div>
        ) : liked.length === 0 ? (
          <div className="wl-empty">
            <HeartOutlineIcon size={36} />
            <p>Nothing liked yet</p>
            <span>Tap the heart on any car and it shows up here, on web and in the app.</span>
            <Link to="/" className="btn-primary">
              Browse cars
            </Link>
          </div>
        ) : (
          <div className="grid">
            {liked.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}

        {!loading && recent.length > 0 && (
          <>
            <div className="wl-chip neutral" style={{ marginTop: 44 }}>
              <ClockIcon size={15} /> Recently viewed
            </div>
            <div className="recent-card">
              {recent.map((car) => (
                <Link to={`/cars/${car.id}`} className="recent-item" key={car.id}>
                  <CarPhoto car={car} className="pic" />
                  <b>{car.name}</b>
                  <span>{formatKES(car.pricePerDay)}/day</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
