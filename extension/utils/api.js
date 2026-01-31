// Simple API helpers to call Mail TraceX backend from extension
export async function fetchProfile(token) {
  return fetch(`${process.env.API_URL || 'http://localhost:4000'}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
}
