const { OFFICIAL_SERVER } = require('./runtime.cjs');

function configureSecretStore(app, platform = process.platform, environment = process.env) {
  if (platform !== 'linux' || app.commandLine.hasSwitch('password-store')) return;
  const desktop = [environment.XDG_CURRENT_DESKTOP, environment.DESKTOP_SESSION, environment.XDG_SESSION_DESKTOP].filter(Boolean).join(':');
  // Chromium recognises GNOME/KDE automatically, but selects basic_text on
  // Hyprland/Sway. Secret Service also works on those desktops when installed.
  if (!/(?:^|[:;\s])(?:kde\d*|plasma(?:wayland|x11)?)(?:$|[:;\s])/i.test(desktop)) {
    app.commandLine.appendSwitch('password-store', 'gnome-libsecret');
  }
}

function releaseError(code, message) {
  return Object.assign(new Error(message), { code });
}

async function publicReleases(fetcher = fetch) {
  let response;
  try {
    // Public metadata must work before enrollment and after a failed setup.
    // Never forward account tokens, cookies, pairing keys or redirects.
    response = await fetcher(OFFICIAL_SERVER + '/downloads/releases.json', {
      headers: { Accept: 'application/json' }, redirect: 'error', credentials: 'omit',
      signal: AbortSignal.timeout(15000), cache: 'no-store',
    });
  } catch {
    throw releaseError('release_unreachable', 'Rasmiy yuklab olish serveriga ulanib bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.');
  }
  if (response.status === 404) return { origin: OFFICIAL_SERVER, release: { schema: 1 } };
  if (!response.ok) throw releaseError('release_service', 'Yuklab olish serveri vaqtincha javob bermayapti. Birozdan keyin qayta urinib ko‘ring.');
  let release;
  try { release = await response.json(); } catch {}
  if (!release || release.schema !== 1) throw releaseError('release_format', 'Yuklamalar ro‘yxatini o‘qib bo‘lmadi. Qayta tekshiring yoki rasmiy saytdan yuklab oling.');
  return { origin: OFFICIAL_SERVER, release };
}

async function serveReleases(request, response, fetcher = fetch) {
  let status = 200, body;
  if (request.method !== 'GET') {
    status = 405; body = { detail: 'Bu manzil faqat yuklamalar ro‘yxatini ko‘rsatadi.' };
  } else {
    try { body = await publicReleases(fetcher); }
    catch (error) { status = 503; body = { detail: error.message, code: error.code }; }
  }
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 405 ? { Allow: 'GET' } : {}) });
  response.end(JSON.stringify(body));
}

module.exports = { configureSecretStore, publicReleases, serveReleases };
