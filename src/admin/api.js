// Thin client for the CMS endpoints. Errors carry the API's message and,
// for validation failures, a { path: message } map in `fields`.

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? { Accept: 'application/json' } : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Can’t reach the server. Is the API running?');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status}).`);
    err.status = res.status;
    err.fields = data.fields;
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized();
    throw err;
  }
  return data;
}

export const api = {
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  content: () => request('/admin/content'),
  saveSection: (key, data) => request(`/admin/content/${key}`, { method: 'PUT', body: data }),
  messages: () => request('/admin/messages'),
  setRead: (id, read) => request(`/admin/messages/${id}`, { method: 'PATCH', body: { read } }),
  deleteMessage: (id) => request(`/admin/messages/${id}`, { method: 'DELETE' }),
  changePassword: (currentPassword, newPassword) =>
    request('/admin/account/password', { method: 'PUT', body: { currentPassword, newPassword } }),
};
