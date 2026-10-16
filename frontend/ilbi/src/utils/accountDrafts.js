import { localStore } from './brandStorage.js';

const OWNER_KEY = 'ilbi_legacy_draft_owner_v1';
const LEGACY_KINDS = new Set(['pos_cart', 'pos_partner_sale', 'draft_product', 'draft_category', 'draft_stock_variant', 'draft_stock_qty', 'draft_stock_note', 'stock_intake_full_draft_v1']);

// Capture the last known owner before authentication is cleared. Unattributed
// legacy drafts remain stored but are never handed to the next person to log in.
export function captureLegacyDraftOwner(userId, cachedProfile) {
  if (localStore.getItem(OWNER_KEY) !== null) return;
  const matches = userId && String(cachedProfile?.id) === String(userId);
  localStore.setItem(OWNER_KEY, JSON.stringify({
    ownerId: matches ? String(userId) : null,
    tenantIds: matches && Array.isArray(cachedProfile.tenants) ? cachedProfile.tenants.map(tenant => String(tenant.id)) : [],
  }));
}

export function accountDraftKey(kind, userId, tenantId) {
  return userId && tenantId ? `ilbi_account_draft:${userId}:${tenantId}:${kind}` : null;
}

export function readAccountDraft(kind, userId, tenantId, fallback) {
  const key = accountDraftKey(kind, userId, tenantId);
  if (!key) return fallback;
  try {
    const saved = localStore.getItem(key);
    if (saved !== null) return JSON.parse(saved);
    const owner = JSON.parse(localStore.getItem(OWNER_KEY) || 'null');
    if (LEGACY_KINDS.has(kind) && owner?.ownerId === String(userId) && owner.tenantIds.includes(String(tenantId))) {
      const legacy = localStore.getItem(`ilbi_${kind}:${tenantId}`);
      if (legacy !== null) {
        const value = JSON.parse(legacy);
        // Keep the source as a recovery copy, including on quota failures.
        localStore.setItem(key, legacy);
        return value;
      }
    }
  } catch { /* Corrupt drafts must not break the page or cross an identity boundary. */ }
  return fallback;
}

export function writeAccountDraft(kind, userId, tenantId, value) {
  const key = accountDraftKey(kind, userId, tenantId);
  if (!key) return false;
  const serialized = JSON.stringify(value);
  localStore.setItem(key, serialized);
  return localStore.getItem(key) === serialized;
}
