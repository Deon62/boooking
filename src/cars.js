import { useEffect, useState } from 'react';
import * as api from './api.js';

// Live car data from api.ardena.xyz, mapped to the shape the pages were built
// around. Results are cached at module level so navigating between pages
// doesn't refetch.

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Map an API CarListing (API.md) to the internal car shape. */
export function mapCar(c) {
  const photos = [...new Set([c.cover_image, ...(c.car_images || []), ...(c.image_urls || [])])].filter(
    Boolean
  );
  const model = c.model ? String(c.model) : '';
  const title =
    model && !String(c.name).toLowerCase().includes(model.toLowerCase())
      ? `${c.name} ${model}`
      : c.name;
  return {
    id: String(c.id),
    name: title,
    type: cap(c.body_type),
    year: c.year,
    transmission: cap(c.transmission),
    fuel: cap(c.fuel_type),
    seats: c.seats,
    pricePerDay: c.daily_rate,
    rating: c.rating ?? null,
    city: c.host_city,
    locationName: c.location_name,
    driveTypes: c.allowed_drive_types?.length ? c.allowed_drive_types : ['self'],
    minAge: c.min_age_requirement,
    minRentalDays: c.min_rental_days || 1,
    maxRentalDays: c.max_rental_days,
    deposit: c.deposit_required ? c.deposit_amount : null,
    photos,
    description: c.description,
    features: c.features || [],
    rules: c.rules,
    isRentersFavourite: Boolean(c.is_renters_favourite),
    host: {
      id: c.host_id,
      name: c.host_name || 'Ardena host',
      avatarUrl: c.host_avatar_url,
      joined: c.host_created_at ? String(new Date(c.host_created_at).getFullYear()) : null,
    },
  };
}

let listCache = null;
const carCache = new Map();

export function useCars() {
  const [state, setState] = useState(() => ({
    cars: listCache || [],
    loading: !listCache,
    error: null,
  }));

  useEffect(() => {
    if (listCache) return undefined;
    let on = true;
    api
      .listCars({ limit: 100 })
      .then((data) => {
        const cars = data.cars.map(mapCar);
        listCache = cars;
        cars.forEach((car) => carCache.set(car.id, car));
        if (on) setState({ cars, loading: false, error: null });
      })
      .catch((e) => {
        if (on) setState({ cars: [], loading: false, error: e.message });
      });
    return () => {
      on = false;
    };
  }, []);

  return state;
}

export function useCar(id) {
  const [state, setState] = useState(() => ({
    car: carCache.get(id) || null,
    loading: !carCache.has(id),
    error: null,
  }));

  useEffect(() => {
    if (!id) {
      setState({ car: null, loading: false, error: null });
      return undefined;
    }
    const cached = carCache.get(id);
    if (cached) {
      setState({ car: cached, loading: false, error: null });
      return undefined;
    }
    let on = true;
    setState({ car: null, loading: true, error: null });
    api
      .getCar(id)
      .then((data) => {
        const car = mapCar(data);
        carCache.set(car.id, car);
        if (on) setState({ car, loading: false, error: null });
      })
      .catch((e) => {
        // 404 (unknown id) and 422 (malformed id) → "car not found"
        const notFound = e.status === 404 || e.status === 422;
        if (on) setState({ car: null, loading: false, error: notFound ? null : e.message });
      });
    return () => {
      on = false;
    };
  }, [id]);

  return state;
}

const ratingsCache = new Map();

export function useCarRatings(id) {
  const [state, setState] = useState(
    () => ratingsCache.get(id) || { reviews: [], total: 0, average: null, loading: true }
  );

  useEffect(() => {
    if (!id) return undefined;
    const cached = ratingsCache.get(id);
    if (cached) {
      setState(cached);
      return undefined;
    }
    let on = true;
    api
      .getCarRatings(id)
      .then((data) => {
        const value = {
          reviews: (data.ratings || [])
            .filter((r) => r.review)
            .map((r) => ({
              name: r.client_name || 'Ardena renter',
              date: r.created_at
                ? new Date(r.created_at).toLocaleDateString('en-KE', {
                    month: 'short',
                    year: 'numeric',
                  })
                : '',
              text: r.review,
              rating: r.rating,
            })),
          total: data.total || 0,
          average: data.average_rating ?? null,
          loading: false,
        };
        ratingsCache.set(id, value);
        if (on) setState(value);
      })
      .catch(() => {
        if (on) setState({ reviews: [], total: 0, average: null, loading: false });
      });
    return () => {
      on = false;
    };
  }, [id]);

  return state;
}

/** Map an API BookingResponse to the shape the trips/confirmation pages use. */
export function mapBooking(b) {
  const model = b.car_model ? String(b.car_model) : '';
  const carName =
    b.car_name && model && !b.car_name.toLowerCase().includes(model.toLowerCase())
      ? `${b.car_name} ${model}`
      : b.car_name || 'Car';
  return {
    id: b.booking_id,
    status: b.status,
    pickupDate: String(b.start_date).slice(0, 10),
    pickupTime: b.pickup_time || '',
    dropoffDate: String(b.end_date).slice(0, 10),
    dropoffTime: b.return_time || '',
    pickupLocation: b.pickup_location || '',
    dropoffLocation: b.return_location || b.pickup_location || '',
    driveType: b.drive_type || 'self',
    checkIn: b.check_in_preference,
    notes: b.special_requirements,
    damageWaiver: Boolean(b.damage_waiver_enabled),
    days: b.rental_days,
    dailyRate: b.daily_rate,
    subtotal: b.base_price,
    waiver: b.damage_waiver_fee,
    deposit: b.deposit_amount || 0,
    depositStatus: b.deposit_status,
    depositRefunded: b.deposit_refunded_amount,
    total: b.total_price,
    cancellationReason: b.cancellation_reason,
    refundPolicyReason: b.refund_policy_reason,
    requiresHandoverCode: Boolean(b.requires_handover_code),
    createdAt: b.created_at,
    car: {
      id: String(b.car_id),
      name: carName,
      photos: b.car_image_urls || [],
      locationName: b.pickup_location || '',
      host: { id: b.host_id, name: b.host_name || 'Ardena host' },
    },
  };
}

// ---------- recently viewed (local, for the wishlist page) ----------

const LS_RECENT = 'ardena.web.recentCars';
const RECENT_MAX = 8;

export function noteRecentlyViewed(id) {
  try {
    const current = JSON.parse(localStorage.getItem(LS_RECENT)) || [];
    const next = [id, ...current.filter((x) => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(LS_RECENT, JSON.stringify(next));
  } catch {
    /* storage unavailable — skip */
  }
}

export function getRecentlyViewed() {
  try {
    return JSON.parse(localStorage.getItem(LS_RECENT)) || [];
  } catch {
    return [];
  }
}

/** Star label that copes with unrated cars. */
export function ratingLabel(car) {
  return car.rating ? car.rating.toFixed(1) : 'New';
}

/** Expand availability ranges into a Set of ISO dates for the calendar. */
export function unavailableDateSet(availability) {
  const days = new Set();
  for (const range of availability?.unavailable_dates || []) {
    const start = new Date(String(range.start_date).slice(0, 10) + 'T00:00:00');
    const end = new Date(String(range.end_date).slice(0, 10) + 'T00:00:00');
    for (let d = start, i = 0; d <= end && i < 366; d.setDate(d.getDate() + 1), i++) {
      days.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`
      );
    }
  }
  return days;
}
