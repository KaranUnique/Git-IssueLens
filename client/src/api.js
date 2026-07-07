const BASE = import.meta.env.VITE_API_BASE_URL || ''

function getSessionId() {
  let id = localStorage.getItem('sessionId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('sessionId', id)
  }
  return id
}

export function apiUrl(path) {
  return `${BASE}${path}`
}

export function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), {
    ...options,
    headers: {
      'x-session-id': getSessionId(),
      ...(options.headers || {})
    }
  })
}
