// Small, dependency-free form validators shared by the auth forms.
// Each returns an { field: message } map; empty means valid.

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());

export function validateLogin({ email, password }) {
  const e = {};
  if (!email.trim()) e.email = 'Enter your email address.';
  else if (!isEmail(email)) e.email = 'That doesn’t look like a valid email.';
  if (!password) e.password = 'Enter your password.';
  return e;
}

export function validateSignup({ name, email, password, confirm }) {
  const e = {};
  if (!name.trim()) e.name = 'Enter your name.';
  if (!email.trim()) e.email = 'Enter your email address.';
  else if (!isEmail(email)) e.email = 'That doesn’t look like a valid email.';
  if (!password) e.password = 'Choose a password.';
  else if (password.length < 8) e.password = 'Use at least 8 characters.';
  if (!confirm) e.confirm = 'Repeat your password.';
  else if (password !== confirm) e.confirm = 'Passwords don’t match.';
  return e;
}
