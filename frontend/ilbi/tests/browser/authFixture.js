// Synthetic responses only: this fixture never calls a real API or sends an OTP.
export function installAuthFixture({ saved = true, profileFailure = false } = {}) {
  const user = { id: 41, username: 'session_test', first_name: 'Sessiya', last_name: 'Sinov', role: 'platform_admin', terms_accepted: true, tenants: [], permissions: [], phone_number: '+998900000041' };
  const jwt = (id, kind) => `fixture.${btoa(JSON.stringify({ user_id: id, exp: Date.now() / 1000 + 3600, token_type: kind }))}.fixture`;
  const tokens = { access: jwt(user.id, 'access'), refresh: jwt(user.id, 'refresh') };
  const conversation = { id: 'private-41', subject: 'Shaxsiy sinov suhbati', name: 'Sinov', status: 'active', operator_id: user.id, unread_count: 0 };
  const message = { id: 101, text: 'PRIVATE_HISTORY_SENTINEL', sender: 'visitor', author_name: 'Sinov', created_at: '2026-10-16T07:00:00Z' };
  window.authQA = { requests: [], user, tokens, profileFailure, holdProfile: false, pendingProfiles: [], holdList: false, pendingLists: [] };
  if (saved) {
    localStorage.setItem('ilbi_access_token', tokens.access);
    localStorage.setItem('ilbi_refresh_token', tokens.refresh);
    localStorage.setItem('ilbi_user', JSON.stringify(user));
  }
  const nativeFetch = window.fetch.bind(window);
  const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
  window.fetch = async (input, options = {}) => {
    const url = new URL(input, location.origin);
    if (!url.pathname.startsWith('/api/')) return nativeFetch(input, options);
    const path = url.pathname;
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : null;
    authQA.requests.push({ path, method: options.method || 'GET', authorized: Boolean(options.headers?.Authorization) });
    if (path === '/api/v1/auth/me/') {
      if (authQA.holdProfile) await new Promise(resolve => authQA.pendingProfiles.push(resolve));
      if (authQA.profileFailure) throw new TypeError('Synthetic offline response');
      return json(authQA.user);
    }
    if (path === '/api/v1/auth/token/refresh/') return json(tokens);
    if (path === '/api/v1/auth/admin-login/') return json({ login_ticket: 'synthetic-ticket', telegram_linked: true, phone_hint: '+998 ** *** ** 41' });
    if (path === '/api/v1/auth/admin-login/send-otp/') return json({ otp_sent: true });
    if (path === '/api/v1/auth/admin-login/verify-otp/') return body?.verification_code === '123456' ? json(tokens) : json({ detail: 'Invalid OTP' }, 401);
    if (path === '/api/v1/platform/support-unread/') return json({ unread: 0 });
    if (path === '/api/v1/platform/overview/') return json({ counts: {}, activity: [] });
    if (path === '/api/v1/docs/') return json({ documents: [] });
    if (path === '/api/v1/support/metadata/') return json({ phone: '', telegram_username: '', languages: ['uz'] });
    if (path === '/api/v1/support/guest/') return json({ results: [], unread_total: 0 });
    if (path.startsWith('/api/v1/support/guest/')) return json({ detail: 'Not found' }, 404);
    if (path === '/api/v1/support/inbox/' || path === '/api/v1/support/conversations/') {
      if (authQA.holdList) await new Promise(resolve => authQA.pendingLists.push(resolve));
      return json({ results: [conversation], unread_total: 0 });
    }
    if (path.endsWith('/private-41/messages/')) return json({ results: url.searchParams.has('after_id') ? [] : [message], has_more: false });
    if (path.endsWith('/private-41/')) return json(conversation);
    throw new Error(`Unexpected synthetic API request: ${path}`);
  };
}
