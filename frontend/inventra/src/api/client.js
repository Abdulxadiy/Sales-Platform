/**
 * Inventra API Client with JWT Interceptor & Automatic Refresh
 */

const BASE_URL = '/api/v1';

// Token Management
export const isRememberMeActive = () => {
  return localStorage.getItem('inventra_remember_me') !== 'false';
};

export const getAccessToken = () =>
  localStorage.getItem('inventra_access_token') ||
  sessionStorage.getItem('inventra_access_token');

export const getRefreshToken = () =>
  localStorage.getItem('inventra_refresh_token') ||
  sessionStorage.getItem('inventra_refresh_token');

export const setTokens = (access, refresh, remember = null) => {
  const shouldRemember = remember !== null
    ? remember
    : (Boolean(localStorage.getItem('inventra_access_token') || localStorage.getItem('inventra_refresh_token')) || isRememberMeActive());

  if (shouldRemember) {
    if (access) localStorage.setItem('inventra_access_token', access);
    if (refresh) localStorage.setItem('inventra_refresh_token', refresh);
    sessionStorage.removeItem('inventra_access_token');
    sessionStorage.removeItem('inventra_refresh_token');
  } else {
    if (access) sessionStorage.setItem('inventra_access_token', access);
    if (refresh) sessionStorage.setItem('inventra_refresh_token', refresh);
    localStorage.removeItem('inventra_access_token');
    localStorage.removeItem('inventra_refresh_token');
  }
};

export const clearTokens = () => {
  localStorage.removeItem('inventra_access_token');
  localStorage.removeItem('inventra_refresh_token');
  localStorage.removeItem('inventra_user');
  sessionStorage.removeItem('inventra_access_token');
  sessionStorage.removeItem('inventra_refresh_token');
  sessionStorage.removeItem('inventra_user');
};

export const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export const resolveAvatarUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  let url = raw.trim();
  url = url.replace(/^https?:\/\/(nginx|inventra(:\d+)?)/, '');
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
};

export const resolveMediaUrl = resolveAvatarUrl;

async function handleResponse(response, responseType) {
  if (response.status === 204) {
    return null;
  }
  if (response.ok && responseType === 'blob') return response.blob();

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let errorMsg = 'Kutilmagan xatolik yuz berdi';

    if (response.status === 429) {
      errorMsg =
        (typeof data === 'object' && (data?.detail || data?.message || data?.error?.message)) ||
        (typeof data === 'object' && data?.retry_after_seconds
          ? `Iltimos, ${data.retry_after_seconds} soniyadan keyin qayta urinib ko'ring.`
          : null) ||
        "So'rovlar soni me'yordan oshib ketdi (429 Too Many Requests). Iltimos, biroz kuting.";
    } else if (data && typeof data === 'object') {
      if (data.error === 'telegram_send_failed') {
        errorMsg = data.detail || 'Telegram bot orqali tasdiqlash kodini yuborib bo‘lmadi. Iltimos, Telegramda @ilbi_bot ga kirib, /start bosing va telefon raqamingizni ulang.';
      } else if (data.error === 'telegram_contact_not_found') {
        errorMsg = data.detail || 'Telefon raqamingiz Telegram botga ulanmagan. Iltimos, Telegramda @ilbi_bot ga kirib, /start bosing va telefon raqamingizni ulang.';
      } else {
        errorMsg =
          data.detail ||
          data.message ||
          (typeof data.error === 'string' ? data.error : data.error?.message) ||
          (Array.isArray(data) ? data[0] : JSON.stringify(data));
      }
    } else if (typeof data === 'string') {
      if (data.trim().startsWith('<')) {
        errorMsg = `Server xatoligi (${response.status} ${response.statusText || ''})`.trim();
      } else {
        errorMsg = data;
      }
    }

    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

let refreshPromise = null;

export function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  const refresh = getRefreshToken();
  refreshPromise = (async () => {
    if (!refresh || isTokenExpired(refresh)) {
      const error = new Error('Sessiya muddati tugadi. Qaytadan kiring.');
      error.status = 401;
      throw error;
    }
    const response = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    const data = await handleResponse(response);
    if (getRefreshToken() !== refresh) throw new Error('Sessiya o‘zgargan.');
    setTokens(data.access, data.refresh || refresh);
    window.dispatchEvent(new CustomEvent('auth:token', { detail: data.access }));
    return data.access;
  })().catch((error) => {
    if (getRefreshToken() === refresh && (error.status === 401 || !refresh || isTokenExpired(refresh))) {
      clearTokens();
      window.dispatchEvent(new Event('auth:logout'));
    }
    throw error;
  }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  let body = options.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body && !isFormData && typeof body === 'object' && !(body instanceof Blob)) {
    body = JSON.stringify(body);
  }
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  let cachedUserId = null;
  try {
    const cachedUser = sessionStorage.getItem('inventra_user')
      || localStorage.getItem('inventra_user');
    cachedUserId = cachedUser ? JSON.parse(cachedUser)?.id : null;
  } catch {
    cachedUserId = null;
  }
  const userId = cachedUserId || parseJwt(getAccessToken())?.user_id;
  const tenantStorageKey = userId ? `inventra_active_tenant:${userId}` : null;
  const activeTenantId = tenantStorageKey
    ? sessionStorage.getItem(tenantStorageKey) || localStorage.getItem(tenantStorageKey)
    : null;
  if (activeTenantId && !endpoint.startsWith('/auth/') && !endpoint.startsWith('/tenants/my/')) {
    headers['X-Tenant-ID'] = activeTenantId;
  }

  const token = getAccessToken();
  const isPublicAuth = endpoint.startsWith('/auth/admin-login') || endpoint.startsWith('/auth/password-reset') || endpoint.startsWith('/auth/token');
  if (token && !isPublicAuth && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    body,
    headers,
  };

  try {
    let response = await fetch(url, config);

    const isAuthRoute = endpoint.startsWith('/auth/admin-login')
      || endpoint.startsWith('/auth/token') || endpoint.startsWith('/auth/password-reset');
    if (response.status === 401 && !options._retry && !isAuthRoute) {
      if (String(parseJwt(getAccessToken())?.user_id) !== String(parseJwt(token)?.user_id)) {
        throw new Error('Hisob o‘zgargan. Amalni qayta boshlang.');
      }
      const refreshed = getAccessToken() !== token && !isTokenExpired(getAccessToken())
        ? getAccessToken() : await refreshAccessToken();
      headers.Authorization = `Bearer ${refreshed}`;
      response = await fetch(url, { ...config, headers });
      if (response.status === 401 && getAccessToken() === refreshed) {
        clearTokens();
        window.dispatchEvent(new Event('auth:logout'));
      }
    }

    return handleResponse(response, options.responseType);
  } catch (error) {
    throw error;
  }
}

// -------------------------------------------------------------
// Specialized API Endpoints (Complete Inventra v0.9 API Coverage)
// -------------------------------------------------------------

export const authApi = {
  adminLogin: (username, password) =>
    request('/auth/admin-login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  telegramStatus: (login_ticket) =>
    request('/auth/admin-login/telegram-status/', {
      method: 'POST',
      body: JSON.stringify({ login_ticket }),
    }),

  sendTelegramOtp: (login_ticket) =>
    request('/auth/admin-login/send-otp/', {
      method: 'POST',
      body: JSON.stringify({ login_ticket }),
    }),

  verifyOtp: (login_ticket, verification_code) =>
    request('/auth/admin-login/verify-otp/', {
      method: 'POST',
      body: JSON.stringify({ login_ticket, verification_code }),
    }),

  passwordResetRequest: (identifier) => {
    const ident = (typeof identifier === 'string' ? identifier : identifier?.email || identifier?.login || '').trim();
    const payload = ident.includes('@') ? { email: ident, login: ident } : { login: ident };
    return request('/auth/password-reset/request/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  changePasswordWithOld: ({ login, old_password, new_password }) =>
    request('/auth/password-reset/change-with-old/', {
      method: 'POST',
      body: JSON.stringify({ login, old_password, new_password }),
    }),

  passwordResetVerify: (token) =>
    request('/auth/password-reset/verify/?token=' + encodeURIComponent(token)),

  passwordResetConfirm: (data) =>
    request('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  passwordResetResume: (token) =>
    request('/auth/password-reset/resume/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  getProfile: () => request('/auth/me/'),

  updateProfile: (data) =>
    request('/auth/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (old_password, new_password) =>
    request('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password }),
    }),

  uploadAvatar: (formData) =>
    request('/auth/profile/avatar/', {
      method: 'POST',
      body: formData,
    }),

  deleteAvatar: () =>
    request('/auth/profile/avatar/', {
      method: 'DELETE',
    }),

  unban: (target_user_id) =>
    request('/auth/unban/', {
      method: 'POST',
      body: JSON.stringify({ target_user_id }),
    }),

  acceptTerms: () =>
    request('/auth/accept-terms/', {
      method: 'POST',
    }),
};

export const docsApi = {
  getDocsList: () => request('/docs/'),
  getDoc: (docKey) => request(`/docs/?doc=${encodeURIComponent(docKey)}`),
  updateDoc: (docKey, content) =>
    request('/docs/', {
      method: 'PUT',
      body: JSON.stringify({ doc: docKey, content }),
    }),
};

export const analyticsApi = {
  getDashboard: (period = 'today', startDate = null, endDate = null, tenantId = null) => {
    let q = `?period=${period}`;
    if (period === 'custom' && startDate && endDate) {
      q += `&start_date=${startDate}&end_date=${endDate}`;
    }
    if (tenantId) {
      q += `&tenant_id=${tenantId}`;
    }
    return request(`/analytics/dashboard/${q}`);
  },
};

export const tenantApi = {
  getEmployeePermissions: (tenantId) => request(`/tenants/${tenantId}/employees/permissions/`),
  getMyTenants: () => request('/tenants/my/'),
  createMyTenant: (data) => request('/tenants/my/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  bindMyTenantSellerProfile: (tenantId, sellerProfileId) => request(`/tenants/my/${tenantId}/seller-profile/`, {
    method: 'PATCH',
    body: JSON.stringify({ seller_profile_id: sellerProfileId || null }),
  }),
  getSellerProfiles: () => request('/tenants/seller-profiles/'),
  getSellerProfilesForReview: (params = {}) => {
    const query = new URLSearchParams();
    for (const key of ['status', 'q', 'page', 'page_size']) {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        query.set(key, String(params[key]));
      }
    }
    return request(`/tenants/seller-profiles/review/${query.size ? `?${query}` : ''}`);
  },
  reviewSellerProfile: (id, data) => request(`/tenants/seller-profiles/${id}/review/`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getTransferTargets: () => request('/tenants/current/transfer-targets/'),
  createSellerProfile: (data) => request('/tenants/seller-profiles/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateSellerProfile: (id, data) => request(`/tenants/seller-profiles/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  getTenants: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tenants/${query ? `?${query}` : ''}`);
  },
  getAllTenants: async () => {
    const tenants = [];
    let page = 1;
    while (true) {
      const response = await request(`/tenants/?page=${page}&page_size=100`);
      if (Array.isArray(response)) return response;
      if (!Array.isArray(response?.results)) {
        throw new Error('Do‘konlar ro‘yxati kutilgan shaklda kelmadi.');
      }
      tenants.push(...response.results);
      if (!response.next) return tenants;
      if (response.results.length === 0 || page > Math.ceil(Number(response.count || 0) / 100) + 1) {
        throw new Error('Do‘konlar ro‘yxatini to‘liq yuklab bo‘lmadi.');
      }
      page += 1;
    }
  },
  createTenant: (data) =>
    request('/tenants/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resendOwnerInvite: (id) => request(`/tenants/${id}/resend-owner-invite/`, {
    method: 'POST',
  }),
  updateTenant: (id, data) =>
    request(`/tenants/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  changeOwner: (id, payload) =>
    request(`/tenants/${id}/change-owner/`, {
      method: 'POST',
      body: JSON.stringify(
        typeof payload === 'object' && payload !== null
          ? payload
          : { new_owner_id: payload }
      ),
    }),
  activateTenant: (id) =>
    request(`/tenants/${id}/activate/`, {
      method: 'POST',
    }),
  deactivateTenant: (id) =>
    request(`/tenants/${id}/deactivate/`, {
      method: 'POST',
    }),
  hireEmployee: (tenantId, data) =>
    request(`/tenants/${tenantId}/employees/hire/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getEmployees: (tenantId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tenants/${tenantId}/employees/${query ? `?${query}` : ''}`);
  },
  updateEmployee: (tenantId, employeeId, data) =>
    request(`/tenants/${tenantId}/employees/${employeeId}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  resendEmployeeInvite: (tenantId, employeeId) =>
    request(`/tenants/${tenantId}/employees/${employeeId}/resend-invite/`, { method: 'POST' }),
  setEmployeeBlocked: (tenantId, employeeId, blocked, reason) =>
    request(`/tenants/${tenantId}/employees/${employeeId}/account-status/`, { method: 'POST', body: JSON.stringify({ blocked, reason }) }),
  archiveEmployee: (tenantId, employeeId, reason) =>
    request(`/tenants/${tenantId}/employees/${employeeId}/`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  restoreEmployee: (tenantId, employeeId, reason) =>
    request(`/tenants/${tenantId}/employees/${employeeId}/restore/`, { method: 'POST', body: JSON.stringify({ reason }) }),
  fireEmployee: (tenantId, targetUserId) =>
    request(`/tenants/${tenantId}/employees/fire/`, {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    }),
  getCurrentTenant: (params = {}) => {
    const q = params.tenant_id ? `?tenant_id=${params.tenant_id}` : '';
    return request(`/tenants/current/${q}`);
  },
  updateCurrentTenant: (data, params = {}) => {
    const q = params.tenant_id ? `?tenant_id=${params.tenant_id}` : '';
    return request(`/tenants/current/${q}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  testTelegram: (data = {}) =>
    request('/tenants/current/test-telegram/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  sendDailyReportNow: (data = {}) =>
    request('/tenants/current/send-report-now/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  sendLowStockReportNow: (data = {}) =>
    request('/tenants/current/send-low-stock-report-now/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const catalogApi = {
  getImportTemplate: () => request('/catalog/import/template/', { responseType: 'blob' }),
  previewImport: (body) => request('/catalog/import/preview/', { method: 'POST', body }),
  commitImport: (id) => request(`/catalog/import/${id}/commit/`, { method: 'POST' }),
  generateBarcode: (id) => request(`/catalog/variants/${id}/barcode/`, { method: 'POST' }),
  getCategories: () => request('/catalog/categories/'),
  createCategory: (data) =>
    request('/catalog/categories/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id, data) =>
    request(`/catalog/categories/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id) =>
    request(`/catalog/categories/${id}/`, {
      method: 'DELETE',
    }),
  createProduct: (data) =>
    request('/catalog/products/', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  getProduct: (id) => request(`/catalog/products/${id}/`),
  updateProduct: (id, data) =>
    request(`/catalog/products/${id}/`, {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  deleteProduct: (id) =>
    request(`/catalog/products/${id}/`, {
      method: 'DELETE',
    }),
  uploadProductImage: (productId, formData) =>
    request(`/catalog/products/${productId}/images/`, {
      method: 'POST',
      body: formData,
    }),
  deleteProductImage: (productId, imageId) =>
    request(`/catalog/products/${productId}/images/${imageId}/`, {
      method: 'DELETE',
    }),

  createVariant: (productId, data) =>
    request(`/catalog/products/${productId}/variants/`, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  getVariants: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.barcode) query.append('barcode', params.barcode);
    if (params.category) query.append('category', params.category);
    if (params.in_stock !== undefined) query.append('in_stock', params.in_stock);
    const qs = query.toString();
    return request(`/catalog/variants/${qs ? `?${qs}` : ''}`);
  },
  updateVariant: (id, data) =>
    request(`/catalog/variants/${id}/`, {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  archiveVariant: (id) =>
    request(`/catalog/variants/${id}/archive/`, {
      method: 'POST',
    }),
};

export const inventoryApi = {
  getBatches: (params = {}) => request(`/inventory/batches/?${new URLSearchParams(params)}`),
  getStock: (pageOrParams = 1, search = '') => {
    if (typeof pageOrParams === 'object' && pageOrParams !== null) {
      const query = new URLSearchParams();
      if (pageOrParams.page) query.append('page', pageOrParams.page);
      if (pageOrParams.search) query.append('search', pageOrParams.search);
      const qs = query.toString();
      return request(`/inventory/stock/${qs ? `?${qs}` : ''}`);
    }
    let q = `?page=${pageOrParams}`;
    if (search) q += `&search=${encodeURIComponent(search)}`;
    return request(`/inventory/stock/${q}`);
  },
  getStockDetail: (variantId) => {
    return request(`/inventory/stock/${variantId}/`);
  },
  getMovements: (page = 1) => request(`/inventory/movements/?page=${page}`),
  batchStockIntake: (data) =>
    request('/inventory/intake/batch/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adjustStock: (data) =>
    request('/inventory/adjust/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  customerReturn: (data) =>
    request('/inventory/customer-return/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  supplierReturn: (data) =>
    request('/inventory/supplier-return/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  writeOff: (data) =>
    request('/inventory/write-off/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDeficits: (search = '') => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/inventory/deficits/${q}`);
  },

  // Internal tenant-to-tenant stock movements (separate from B2B sales).
  getTransfers: () => request('/inventory/transfers/'),
  createTransfer: (data) =>
    request('/inventory/transfers/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  acceptTransfer: (id, data) =>
    request(`/inventory/transfers/${id}/receive/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  returnTransfer: (id, data) =>
    request(`/inventory/transfers/${id}/return/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  closeTransferDiscrepancy: (id, reason) =>
    request(`/inventory/transfers/${id}/close-discrepancy/`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

export const salesApi = {
  getSales: (pageOrParams = 1, search = '') => {
    const params = typeof pageOrParams === 'object' ? pageOrParams : { page: pageOrParams, search };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    }
    return request(`/sales/?${query}`);
  },
  getSaleDetail: (id) => request(`/sales/${id}/`),
  rotateReceiptToken: (id) => request(`/sales/${id}/receipt-token/rotate/`, { method: 'POST' }),
  getPublicReceipt: (token) =>
    request(`/sales/public/receipt/${encodeURIComponent(token)}/`),
  createSale: (saleData) =>
    request('/sales/', {
      method: 'POST',
      body: JSON.stringify(saleData),
    }),
  voidSale: (saleId, reason) =>
    request(`/sales/${saleId}/void/`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  voidSaleItem: (saleItemId, payload) => {
    const body = typeof payload === 'string' ? { reason: payload, quantity: 1 } : payload;
    return request(`/sales/items/${saleItemId}/void/`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getCounterparties: (search = '') => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/sales/counterparties/${q}`);
  },
  createCounterparty: (data) =>
    request('/sales/counterparties/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCounterparty: (id, data) =>
    request(`/sales/counterparties/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCounterparty: (id) =>
    request(`/sales/counterparties/${id}/`, {
      method: 'DELETE',
    }),

  getCounterpartySales: (counterpartyId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/sales/counterparties/${counterpartyId}/sales/${qs ? '?' + qs : ''}`);
  },
  getCounterpartyPayments: (counterpartyId, page = 1) =>
    request(`/sales/counterparties/${counterpartyId}/payments/?page=${page}`),
  recordDebtPayment: (counterpartyId, data) =>
    request(`/sales/counterparties/${counterpartyId}/payments/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  correctDebtPayment: (counterpartyId, data) =>
    request(`/sales/counterparties/${counterpartyId}/payments/correct/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getB2BInbox: () => request('/sales/b2b/inbox/'),
  acceptB2B: (saleId, itemsPayload) =>
    request(`/sales/b2b/${saleId}/accept/`, {
      method: 'POST',
      body: JSON.stringify(itemsPayload || { items: [] }),
    }),
  rejectB2B: (saleId, reason) =>
    request(`/sales/b2b/${saleId}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  receiveB2BReturn: (saleId, payload) =>
    request(`/sales/b2b/${saleId}/returns/receive/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  closeB2BReturnDiscrepancy: (saleId, payload) =>
    request(`/sales/b2b/${saleId}/returns/close-discrepancy/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getNotifications: () => request('/sales/notifications/'),
  markNotificationRead: (id) =>
    request(`/sales/notifications/${id}/read/`, {
      method: 'POST',
    }),
  clearAllNotifications: () =>
    request('/sales/notifications/', {
      method: 'DELETE',
    }),
  deleteNotification: (id) =>
    request(`/sales/notifications/${id}/`, {
      method: 'DELETE',
    }),
};

export const cashboxApi = {
  openShift: (data) => request('/cashbox/shift/open/', { method: 'POST', body: data }),
  getCurrentShift: () => {
    return request('/cashbox/shift/current/');
  },
  closeShift: (data) =>
    request('/cashbox/shift/close/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getExpenses: () => {
    return request('/cashbox/expenses/');
  },
  createExpense: (data) =>
    request('/cashbox/expenses/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getIncome: () => {
    return request('/cashbox/income/');
  },
  createIncome: (data) =>
    request('/cashbox/income/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReports: (pageOrParams = 1) => {
    if (typeof pageOrParams === 'object' && pageOrParams !== null) {
      const query = new URLSearchParams();
      if (pageOrParams.page) query.append('page', pageOrParams.page);
      const qs = query.toString();
      return request(`/cashbox/reports/${qs ? `?${qs}` : ''}`);
    }
    let q = `?page=${pageOrParams}`;
    return request(`/cashbox/reports/${q}`);
  },
  getReportDetail: (id) => request(`/cashbox/reports/${id}/`),
};

export const auditApi = {
  getLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.action) query.append('action', params.action);
    if (params.actor) query.append('actor', params.actor);
    if (params.target_model) query.append('target_model', params.target_model);
    if (params.tenant_id) query.append('tenant_id', params.tenant_id);
    const qs = query.toString();
    return request(`/audit/logs/${qs ? `?${qs}` : ''}`);
  },
};

