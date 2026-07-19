import React, { useState } from 'react';

// Airbnb-style two-month date-range picker (see src/assets/airbnb.png).
// Dates are ISO strings (YYYY-MM-DD) so lexicographic comparison works.

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function fmtShort(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
  });
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function Month({ year, month, start, end, minDate, disabledDates, onPick, className = '' }) {
  const first = new Date(year, month, 1);
  const label = first.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
  const lead = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className={`cal-month ${className}`}>
      <div className="cal-title">{label}</div>
      <div className="cal-grid">
        {DOW.map((d, i) => (
          <div key={`d${i}`} className="cal-dow">
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const dIso = iso(date);
          const disabled = (minDate && dIso < minDate) || (disabledDates && disabledDates.has(dIso));
          const isSel = dIso === start || dIso === end;
          const inRange = start && end && dIso > start && dIso < end;
          const cls = ['cal-day', disabled && 'disabled', isSel && 'sel', inRange && 'in-range']
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={i}
              type="button"
              className={cls}
              disabled={disabled}
              onClick={() => onPick(dIso)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One-month single-date picker (trip-extension drop-off etc.). */
export function SingleDateCalendar({ value, onChange, minDate }) {
  const [view, setView] = useState(() => {
    const base = value || minDate;
    const d = base ? new Date(base + 'T00:00:00') : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const shift = (n) =>
    setView((v) => {
      const d = new Date(v.year, v.month + n, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <div className="cal-single">
      <div className="cal-months">
        <button type="button" className="cal-arrow left" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <Month
          year={view.year}
          month={view.month}
          start={value}
          end={value}
          minDate={minDate}
          onPick={onChange}
        />
        <button type="button" className="cal-arrow right" onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
      </div>
    </div>
  );
}

const FLEX_CHIPS = ['Exact dates', '± 1 day', '± 2 days', '± 3 days', '± 7 days', '± 14 days'];

export function DateRangeCalendar({ start, end, onChange, minDate, disabledDates }) {
  const [view, setView] = useState(() => {
    const d = start ? new Date(start + 'T00:00:00') : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [chip, setChip] = useState('Exact dates');

  const shift = (n) =>
    setView((v) => {
      const d = new Date(v.year, v.month + n, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const pick = (dIso) => {
    if (!start || (start && end) || dIso <= start) onChange(dIso, null);
    else onChange(start, dIso);
  };

  const next = new Date(view.year, view.month + 1, 1);

  return (
    <div className="cal">
      <div className="cal-tabs">
        <button type="button" className="cal-tab active">
          Dates
        </button>
        <button type="button" className="cal-tab">
          Flexible
        </button>
      </div>
      <div className="cal-months">
        <button type="button" className="cal-arrow left" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <Month
          year={view.year}
          month={view.month}
          start={start}
          end={end}
          minDate={minDate}
          disabledDates={disabledDates}
          onPick={pick}
        />
        <Month
          className="cal-m2"
          year={next.getFullYear()}
          month={next.getMonth()}
          start={start}
          end={end}
          minDate={minDate}
          disabledDates={disabledDates}
          onPick={pick}
        />
        <button type="button" className="cal-arrow right" onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="cal-chips">
        {FLEX_CHIPS.map((c) => (
          <button
            type="button"
            key={c}
            className={`cal-chip${chip === c ? ' active' : ''}`}
            onClick={() => setChip(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
