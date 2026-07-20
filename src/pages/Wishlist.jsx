import React from 'react';
import { Link } from 'react-router-dom';
import { useCars, getRecentlyViewed } from '../cars.js';
import { CarPhoto } from '../components.jsx';
import { useApp } from '../store.jsx';
import { HeartIcon, HeartOutlineIcon, ClockIcon } from '../icons.jsx';

/** Up-to-four photo collage that reshapes itself to the number of cars:
 * 1 → full bleed, 2 → split, 3 → one tall + two stacked, 4 → even 2×2.
 * A "+N" badge sits on the last tile when more cars exist than fit. */
function Collage({ cars, emptyIcon }) {
  const visible = cars.slice(0, 4);
  const extra = cars.length - visible.length;

  if (visible.length === 0) {
    return (
      <Link to="/" className="collage collage-empty">
        <span className="collage-empty-icon">{emptyIcon}</span>
      </Link>
    );
  }

  return (
    <div className={`collage n-${visible.length}`}>
      {visible.map((car, i) => (
        <Link to={`/cars/${car.id}`} className="collage-tile" key={car.id}>
          <CarPhoto car={car} className="collage-pic" />
          {i === visible.length - 1 && extra > 0 && (
            <span className="collage-more">+{extra}</span>
          )}
        </Link>
      ))}
    </div>
  );
}

function WishCard({ title, icon, cars, emptyIcon, emptyText }) {
  const count = cars.length;
  return (
    <div className="wish-card">
      <Collage cars={cars} emptyIcon={emptyIcon} />
      <div className="wish-card-foot">
        <span className="wish-card-title">
          {icon}
          {title}
        </span>
        <span className="wish-card-count">
          {count === 0 ? emptyText : `${count} car${count === 1 ? '' : 's'}`}
        </span>
      </div>
    </div>
  );
}

export default function Wishlist() {
  const { wishlist } = useApp();
  const { cars, loading } = useCars();

  const liked = cars.filter((c) => wishlist.has(c.id));
  const likedIds = new Set(liked.map((c) => c.id));
  const recent = getRecentlyViewed()
    .map((id) => cars.find((c) => c.id === id))
    .filter(Boolean)
    .filter((c) => !likedIds.has(c.id));

  return (
    <div className="page">
      <div className="container wide">
        <div className="wl-head">
          <h1 className="page-title">Wishlist</h1>
          <p className="wl-sub">Everything you&apos;ve looked at and loved, in one place.</p>
        </div>

        {loading ? (
          <div className="wish-cards">
            {[0, 1].map((i) => (
              <div className="wish-card" key={i}>
                <div className="collage skeleton">
                  <div className="img-skel" />
                </div>
                <div className="wish-card-foot">
                  <div className="skel-line" style={{ width: '40%', marginTop: 0 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="wish-cards">
            <WishCard
              title="Recently viewed"
              icon={<ClockIcon size={16} className="wc-ico-clock" />}
              cars={recent}
              emptyIcon={<ClockIcon size={26} />}
              emptyText="Nothing viewed yet"
            />
            <WishCard
              title="Liked"
              icon={<HeartIcon filled size={16} />}
              cars={liked}
              emptyIcon={<HeartOutlineIcon size={26} />}
              emptyText="Nothing liked yet"
            />
          </div>
        )}
      </div>
    </div>
  );
}
