import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from './store.jsx';
import { formatKES } from './data.js';
import logoUrl from './assets/logo.svg';
import appstoreImg from './assets/appstore.png';
import playImg from './assets/play.png';
import {
  UserIcon,
  SuitcaseIcon,
  LogOutIcon,
  ChevronDownIcon,
  HeartIcon,
  HeartOutlineIcon,
  ChatIcon,
  CreditCardIcon,
  BellIcon,
  CarIcon,
  ArrowLeftIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  XBrandIcon,
  InstagramIcon,
  TikTokIcon,
  LinkedInIcon,
  WhatsAppIcon,
} from './icons.jsx';

/** Floating back arrow, far left — shown on pages that have a page to go back to. */
export function BackButton({ to }) {
  const navigate = useNavigate();
  return (
    <button
      className="back-fab"
      aria-label="Go back"
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      <ArrowLeftIcon size={20} />
    </button>
  );
}

/** Car photo: shimmer placeholder while loading, fade-in when ready,
 * icon fallback if the image fails. The frame always fills its parent so
 * object-fit: cover crops around the center instead of showing the top slice. */
export function CarPhoto({ car, index = 0, className }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = car.photos[index] || car.photos[0];
  const frameCls = className ? `${className} photo-frame` : 'photo-frame';
  if (failed || !src) {
    return (
      <div className={frameCls}>
        <div className="ph" style={{ background: 'linear-gradient(135deg,#dfe6f3,#c9d4ea)' }}>
          <CarIcon size={44} style={{ color: '#93a1ba' }} />
        </div>
      </div>
    );
  }
  return (
    <div className={frameCls}>
      {!loaded && <div className="img-skel" />}
      <img
        src={src}
        alt={car.name}
        loading="lazy"
        className={loaded ? 'loaded' : ''}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

/** Shimmer placeholder card shown while the car list loads. */
export function CarCardSkeleton() {
  return (
    <div className="car-card" aria-hidden="true">
      <div className="car-photo">
        <div className="img-skel" />
      </div>
      <div className="car-body">
        <div className="skel-line" style={{ width: '62%' }} />
        <div className="skel-line" style={{ width: '38%' }} />
      </div>
    </div>
  );
}

/** User avatar: profile photo from the API when set, initials otherwise. */
export function Avatar({ user, size = 36, fontSize }) {
  const [failed, setFailed] = useState(false);
  const initials =
    `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'A';
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: fontSize || Math.round(size * 0.36) }}
    >
      {user.avatarUrl && !failed ? (
        <img src={user.avatarUrl} alt={user.firstName} onError={() => setFailed(true)} />
      ) : (
        initials
      )}
    </span>
  );
}

export function CarCard({ car }) {
  const { wishlist, toggleWish } = useApp();
  const navigate = useNavigate();
  const wished = wishlist.has(car.id);
  return (
    <Link to={`/cars/${car.id}`} className="car-card">
      <div className="car-photo">
        <CarPhoto car={car} />
        <button
          className="wish-btn"
          aria-label="Save to wishlist"
          onClick={(e) => {
            e.preventDefault();
            if (!toggleWish(car.id)) navigate('/login', { state: { next: '/' } });
          }}
        >
          <HeartIcon filled={wished} size={20} />
        </button>
      </div>
      <div className="car-body">
        <div className="car-title-row">
          <div className="car-title">{car.name}</div>
          <div className="rating">{car.rating ? `★ ${car.rating.toFixed(1)}` : 'New'}</div>
        </div>
        <div className="car-price">
          <b>{formatKES(car.pricePerDay)}</b> <span>/ day</span>
        </div>
      </div>
    </Link>
  );
}

export function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`switch${on ? ' on' : ''}`}
      onClick={() => onChange(!on)}
    />
  );
}

function AccountMenu() {
  const { user, signOut } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) {
    return (
      <Link to="/login" className="btn-primary" style={{ padding: '11px 24px' }}>
        Log in
      </Link>
    );
  }

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="account-wrap" ref={ref}>
      <button className="account-btn" onClick={() => setOpen((v) => !v)}>
        <Avatar user={user} />
        {user.firstName}
        <ChevronDownIcon size={15} style={{ color: 'var(--hint)' }} />
      </button>
      {open && (
        <div className="account-menu">
          <div className="who">
            <b>{user.fullName}</b>
            <span>{user.email}</span>
          </div>
          <button className="menu-item" onClick={() => go('/profile')}>
            <UserIcon size={17} /> Profile
          </button>
          <button className="menu-item" onClick={() => go('/trips')}>
            <SuitcaseIcon size={17} /> My trips
          </button>
          <button className="menu-item" onClick={() => go('/messages')}>
            <ChatIcon size={17} /> Messages
          </button>
          <button className="menu-item" onClick={() => go('/notifications')}>
            <BellIcon size={17} /> Notifications
          </button>
          <button className="menu-item" onClick={() => go('/wishlist')}>
            <HeartOutlineIcon size={17} /> Wishlist
          </button>
          <button className="menu-item" onClick={() => go('/payments')}>
            <CreditCardIcon size={17} /> Payment methods
          </button>
          <button
            className="menu-item danger"
            onClick={() => {
              setOpen(false);
              signOut();
              navigate('/');
            }}
          >
            <LogOutIcon size={17} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <img src={logoUrl} alt="Ardena" className="logo-img" />
        </Link>
        <nav className="header-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Browse cars
          </NavLink>
          <NavLink to="/trips" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            My trips
          </NavLink>
          <AccountMenu />
        </nav>
      </div>
    </header>
  );
}

// Mirrors the ardena.co.ke footer (ardena-web/index.html) with a Bookings column added.
const SOCIALS = [
  { label: 'X', href: 'https://x.com/ardenaAfrica', Icon: XBrandIcon },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/ardena-group/',
    Icon: LinkedInIcon,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/ardena_carrental?igsh=MTE4YmlkdDg4em82MQ==',
    Icon: InstagramIcon,
  },
  { label: 'TikTok', href: 'https://vm.tiktok.com/ZS9RaPxsdJxNK-LfM8K/', Icon: TikTokIcon },
  { label: 'WhatsApp', href: 'https://wa.me/254702248984', Icon: WhatsAppIcon },
];

const APP_STORE_URL = 'https://apps.apple.com/app/ardena/id6772513965';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/dev?id=6656048407762494190';

const ext = { target: '_blank', rel: 'noopener noreferrer' };

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-wrapper">
        <div className="footer-top">
          <Link to="/" className="footer-brand">
            <img src={logoUrl} alt="Ardena" className="footer-logo" />
          </Link>
          <p className="footer-tagline">
            Trusted car rental in Kenya. Connect with verified owners and renters.
          </p>
        </div>
        <hr className="footer-divider" />
        <div className="footer-main">
          <div className="footer-col">
            <h4 className="footer-col-title">Bookings</h4>
            <ul className="footer-links">
              <li>
                <Link to="/">Browse cars</Link>
              </li>
              <li>
                <Link to="/trips">My trips</Link>
              </li>
              <li>
                <Link to="/wishlist">Wishlist</Link>
              </li>
              <li>
                <Link to="/messages">Messages</Link>
              </li>
              <li>
                <Link to="/payments">Payment methods</Link>
              </li>
              <li>
                <Link to="/profile">Profile</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-links">
              <li>
                <a href="https://ardena.co.ke/about" {...ext}>
                  About Us
                </a>
              </li>
              <li>
                <a href="https://ardena.co.ke/teams" {...ext}>
                  Team
                </a>
              </li>
              <li>
                <a href="https://ardena.co.ke/help" {...ext}>
                  Help
                </a>
              </li>
              <li>
                <a href="https://business.ardena.co.ke" {...ext}>
                  Ardena Business
                </a>
              </li>
              <li>
                <a href="https://brandfetch.com/ardena.co.ke" {...ext}>
                  Brand Kit
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">Locations</h4>
            <ul className="footer-links">
              <li>
                <a href="https://ardena.co.ke/car-rental-nairobi" {...ext}>
                  Nairobi
                </a>
              </li>
              <li>
                <a href="https://ardena.co.ke/car-rental-mombasa" {...ext}>
                  Mombasa
                </a>
              </li>
              <li>
                <a href="https://ardena.co.ke/car-rental-kisumu" {...ext}>
                  Kisumu
                </a>
              </li>
              <li>
                <a href="https://ardena.co.ke/car-rental-nakuru" {...ext}>
                  Nakuru
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">Contact</h4>
            <ul className="footer-contact">
              <li>
                <a href="mailto:support@ardena.co.ke">
                  <span className="footer-contact-icon" aria-hidden="true">
                    <MailIcon size={15} />
                  </span>
                  support@ardena.co.ke
                </a>
              </li>
              <li>
                <span className="footer-contact-icon" aria-hidden="true">
                  <PhoneIcon size={15} />
                </span>
                +254 702 248 984
              </li>
              <li>
                <span className="footer-contact-icon" aria-hidden="true">
                  <MapPinIcon size={15} />
                </span>
                Nakuru, Kenya
              </li>
            </ul>
          </div>
          <div className="footer-social-block">
            <div className="footer-social">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a key={label} href={href} className="footer-social-icon" aria-label={label} {...ext}>
                  <Icon size={20} />
                </a>
              ))}
            </div>
            <div className="footer-store-badges">
              <a
                href={APP_STORE_URL}
                className="footer-store-badge footer-store-badge--appstore"
                aria-label="Download on the App Store"
                {...ext}
              >
                <img src={appstoreImg} alt="" className="footer-store-badge-img" />
              </a>
              <a
                href={PLAY_STORE_URL}
                className="footer-store-badge"
                aria-label="Get it on Google Play"
                {...ext}
              >
                <img src={playImg} alt="" className="footer-store-badge-img" />
              </a>
            </div>
          </div>
        </div>
        <hr className="footer-divider" />
        <div className="footer-bottom">
          <p className="footer-copyright">© {new Date().getFullYear()} ardena. All rights reserved.</p>
          <div className="footer-legal">
            <a href="https://ardena.co.ke/terms" {...ext}>
              Terms &amp; Conditions
            </a>
            <a href="https://ardena.co.ke/privacy" {...ext}>
              Privacy Policy
            </a>
            <a href="https://ardena.co.ke/legal" {...ext}>
              Legal
            </a>
            <a href="https://ardena.co.ke/insurance" {...ext}>
              Insurance &amp; Protection
            </a>
            <a href="https://ardena.co.ke/delete-account" {...ext}>
              Delete Account &amp; Data
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
