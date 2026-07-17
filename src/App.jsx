import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProvider, useApp } from './store.jsx';
import { Header, Footer } from './components.jsx';
import Home from './pages/Home.jsx';
import CarDetails from './pages/CarDetails.jsx';
import Booking from './pages/Booking.jsx';
import Payment from './pages/Payment.jsx';
import Confirmation from './pages/Confirmation.jsx';
import Trips from './pages/Trips.jsx';
import TripDetails from './pages/TripDetails.jsx';
import Login, { Signup, Forgot } from './pages/Login.jsx';
import { Profile, License } from './pages/Account.jsx';
import Messages from './pages/Messages.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Payments from './pages/Payments.jsx';
import Notifications from './pages/Notifications.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Logged-out users hitting a protected page are sent to the login page,
 * then returned to where they were heading. */
function RequireAuth({ children }) {
  const { user } = useApp();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ next: location.pathname }} replace />;
  return children;
}

// Focused pages (auth, account, checkout) skip the footer so nothing
// competes with the task at hand.
const HIDE_FOOTER = [
  /^\/login$/,
  /^\/signup$/,
  /^\/forgot$/,
  /^\/profile$/,
  /^\/license$/,
  /^\/pay$/,
  /^\/book\//,
  /^\/confirmed\//,
  /^\/wishlist$/,
];

function FooterGate() {
  const { pathname } = useLocation();
  if (HIDE_FOOTER.some((re) => re.test(pathname))) return null;
  return <Footer />;
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <ScrollToTop />
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cars/:id" element={<CarDetails />} />
          <Route path="/book/:id" element={<RequireAuth><Booking /></RequireAuth>} />
          <Route path="/pay" element={<RequireAuth><Payment /></RequireAuth>} />
          <Route path="/confirmed/:id" element={<RequireAuth><Confirmation /></RequireAuth>} />
          <Route path="/trips" element={<RequireAuth><Trips /></RequireAuth>} />
          <Route path="/trips/:id" element={<RequireAuth><TripDetails /></RequireAuth>} />
          <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
          <Route path="/wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
          <Route path="/payments" element={<RequireAuth><Payments /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/license" element={<RequireAuth><License /></RequireAuth>} />
        </Routes>
        <FooterGate />
      </HashRouter>
    </AppProvider>
  );
}
