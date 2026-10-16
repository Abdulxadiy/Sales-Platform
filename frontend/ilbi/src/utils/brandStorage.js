/** Preserve existing sessions, tenant drafts and guest conversations during rebranding. */
const LEGACY = 'inventra_';
const CURRENT = 'ilbi_';
const AUTH = new Set(['access_token', 'refresh_token', 'user']);
const AUTH_MARKER = 'ilbi_auth_namespace_v1';
const SIMPLE = new Set([
  ...AUTH, 'remember_me', 'remember_login', 'theme', 'sidebar_collapsed',
  'receipt_paper_width', 'support_guest',
]);
const SCOPED = new Set([
  'active_tenant', 'pos_partner_sale', 'pos_cart', 'checkout', 'draft_product',
  'draft_category', 'inventory_filters_v2', 'sales_filters_v2',
  'draft_stock_variant', 'draft_stock_qty', 'draft_stock_note',
  'stock_intake_full_draft_v1', 'receipt_paper_width',
  'custom_expense_categories', 'custom_income_sources',
]);

function suffixOf(key, prefix) {
  if (!key.startsWith(prefix)) return null;
  const suffix = key.slice(prefix.length);
  const base = suffix.split(':', 1)[0];
  return SIMPLE.has(suffix)
    || (suffix.includes(':') && SCOPED.has(base))
    || suffix.startsWith('invoice_signatures_') ? suffix : null;
}

function nativeStorage(kind) {
  try { return globalThis[kind] || null; } catch { return null; }
}

let readyLocal;
let readySession;
let ready = false;

/** Raw values and storage locations are preserved; no tokens or payloads are logged. */
export function migrateBrandStorage(local, session) {
  const stores = [local, session].filter(Boolean);
  let complete = true;
  const attempt = (callback) => {
    try { return callback(); } catch { complete = false; return null; }
  };
  const currentAuth = stores.map(store => Object.fromEntries(
    [...AUTH].map(name => [name, attempt(() => store.getItem(CURRENT + name))]),
  ));
  const oldAuth = stores.map(store => Object.fromEntries(
    [...AUTH].map(name => [name, attempt(() => store.getItem(LEGACY + name))]),
  ));
  const hasCurrentAuth = currentAuth.some(values => Object.values(values).some(value => value !== null))
    || stores.some(store => attempt(() => store.getItem(AUTH_MARKER)) === '1');
  if (complete && !hasCurrentAuth) {
    // Copy a legacy authentication bundle atomically, even if a later write hits quota.
    let copied = true;
    for (const [index, store] of stores.entries()) {
      for (const name of AUTH) {
        const value = oldAuth[index][name];
        if (value !== null) {
          try { store.setItem(CURRENT + name, value); } catch { copied = false; complete = false; }
        }
      }
    }
    if (!copied) {
      for (const store of stores) {
        for (const name of AUTH) attempt(() => store.removeItem(CURRENT + name));
      }
    }
  } else if (complete) {
    for (const [index, store] of stores.entries()) {
      for (const name of AUTH) {
        const value = currentAuth[index][name];
        if (value === null) attempt(() => store.removeItem(LEGACY + name));
        else attempt(() => store.setItem(LEGACY + name, value));
      }
    }
  }

  for (const store of stores) {
    // A saved password is obsolete and must never be migrated under a new name.
    for (const prefix of [LEGACY, CURRENT]) {
      attempt(() => store.removeItem(prefix + 'remember_password'));
    }
    const keys = new Set([...SIMPLE].map(name => LEGACY + name));
    attempt(() => {
      for (let index = 0; index < store.length; index += 1) {
        const key = store.key(index);
        if (key && suffixOf(key, LEGACY) !== null) keys.add(key);
        if (key && suffixOf(key, CURRENT) !== null) {
          keys.add(LEGACY + suffixOf(key, CURRENT));
        }
      }
    });
    for (const oldKey of keys) {
      const name = oldKey.slice(LEGACY.length);
      if (AUTH.has(name)) continue;
      const newKey = CURRENT + name;
      const current = attempt(() => store.getItem(newKey));
      const old = attempt(() => store.getItem(oldKey));
      const value = current ?? old;
      if (value !== null) {
        // Keep the old namespace synchronized for already-open tabs and rollback.
        attempt(() => store.setItem(newKey, value));
        attempt(() => store.setItem(oldKey, value));
      }
    }
  }
  if (complete) {
    for (const store of stores) attempt(() => store.setItem(AUTH_MARKER, '1'));
  }
  return complete;
}

export function markAuthenticationCurrent() {
  for (const kind of ['localStorage', 'sessionStorage']) {
    try { nativeStorage(kind)?.setItem(AUTH_MARKER, '1'); } catch { /* Authentication remains cleared. */ }
  }
}

export function migrateBrowserStorage() {
  const local = nativeStorage('localStorage');
  const session = nativeStorage('sessionStorage');
  if (ready && readyLocal === local && readySession === session) return;
  ready = migrateBrandStorage(local, session);
  readyLocal = local;
  readySession = session;
}

function compatibleStorage(kind) {
  return {
    getItem(key) {
      migrateBrowserStorage();
      const store = nativeStorage(kind);
      if (!store) return null;
      try {
        const current = store.getItem(key);
        const suffix = suffixOf(key, CURRENT);
        if (current !== null || suffix === null || AUTH.has(suffix)) return current;
        const old = store.getItem(LEGACY + suffix);
        if (old !== null) {
          try { store.setItem(key, old); } catch { /* Read still succeeds if storage is full. */ }
        }
        return old;
      } catch { return null; }
    },
    setItem(key, value) {
      migrateBrowserStorage();
      const store = nativeStorage(kind);
      if (!store) return;
      const suffix = suffixOf(key, CURRENT);
      try { store.setItem(key, value); } catch { /* Storage can be unavailable. */ }
      if (suffix !== null) {
        try { store.setItem(LEGACY + suffix, value); } catch { /* Keep the primary value. */ }
      }
    },
    removeItem(key) {
      migrateBrowserStorage();
      const store = nativeStorage(kind);
      if (!store) return;
      try { store.removeItem(key); } catch { /* Continue clearing the legacy value. */ }
      const suffix = suffixOf(key, CURRENT);
      if (suffix !== null || key === CURRENT + 'remember_password') {
        try { store.removeItem(LEGACY + (suffix ?? 'remember_password')); } catch { /* Unavailable storage. */ }
      }
    },
  };
}

export const localStore = compatibleStorage('localStorage');
export const sessionStore = compatibleStorage('sessionStorage');
migrateBrowserStorage();
