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
    if (!payload || !payload.exp) return false;
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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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

  const token = getAccessToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    body,
    headers,
  };

  try {
    let response = await fetch(url, config);

    // If 401 Unauthorized on protected routes, try refreshing access token or log out.
    // Auth endpoints (login, otp, token) should pass through to handleResponse.
    const isAuthRoute = endpoint.startsWith('/auth/admin-login') || endpoint.startsWith('/auth/token');
    if (response.status === 401 && !options._retry && !isAuthRoute) {
      const refreshToken = getRefreshToken();
      if (refreshToken && !isTokenExpired(refreshToken)) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((newToken) => {
            headers['Authorization'] = `Bearer ${newToken}`;
            return fetch(url, { ...config, headers });
          });
        }

        options._retry = true;
        isRefreshing = true;

        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setTokens(data.access, data.refresh || refreshToken);
            processQueue(null, data.access);
            headers['Authorization'] = `Bearer ${data.access}`;
            return fetch(url, { ...config, headers }).then((res) => handleResponse(res));
          } else {
            clearTokens();
            processQueue(new Error('Session expired'), null);
            window.dispatchEvent(new Event('auth:logout'));
            throw new Error('Sessiya muddati tugadi. Qaytadan kiring.');
          }
        } catch (err) {
          clearTokens();
          processQueue(err, null);
          window.dispatchEvent(new Event('auth:logout'));
          throw err;
        } finally {
          isRefreshing = false;
        }
      } else {
        clearTokens();
        window.dispatchEvent(new Event('auth:logout'));
        throw new Error('Avtorizatsiyadan o‘tilmagan. Qaytadan kiring.');
      }
    }

    return handleResponse(response);
  } catch (error) {
    throw error;
  }
}

async function handleResponse(response) {
  if (response.status === 204) {
    return null;
  }

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
        errorMsg = data.detail || 'Telegram bot orqali tasdiqlash kodini yuborib bo‘lmadi. Iltimos, Telegramda @inventraa_bot ga kirib, /start bosing va telefon raqamingizni ulang.';
      } else if (data.error === 'telegram_contact_not_found') {
        errorMsg = data.detail || 'Telefon raqamingiz Telegram botga ulanmagan. Iltimos, Telegramda @inventraa_bot ga kirib, /start bosing va telefon raqamingizni ulang.';
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

// -------------------------------------------------------------
// Specialized API Endpoints (Complete Inventra v0.9 API Coverage)
// -------------------------------------------------------------

export const authApi = {
  adminLogin: (username, password) =>
    request('/auth/admin-login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  verifyOtp: (username, verification_code) =>
    request('/auth/admin-login/verify-otp/', {
      method: 'POST',
      body: JSON.stringify({ username, verification_code }),
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

  passwordResetConfirm: (data) =>
    request('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  completeProfile: (data) =>
    request('/auth/complete-profile/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProfile: () => request('/auth/profile/'),

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
  getTenants: () => request('/tenants/'),
  getTenant: (id) => request(`/tenants/${id}/`),
  createTenant: (data) =>
    request('/tenants/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTenant: (id, data) =>
    request(`/tenants/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteTenant: (id) =>
    request(`/tenants/${id}/`, {
      method: 'DELETE',
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
};

export const catalogApi = {
  getCategories: () => request('/catalog/categories/'),
  createCategory: (data) =>
    request('/catalog/categories/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCategory: (id) => request(`/catalog/categories/${id}/`),
  updateCategory: (id, data) =>
    request(`/catalog/categories/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id) =>
    request(`/catalog/categories/${id}/`, {
      method: 'DELETE',
    }),
  archiveCategory: (id) =>
    request(`/catalog/categories/${id}/archive/`, {
      method: 'POST',
    }),

  getProducts: (params = '') => request(`/catalog/products/${params}`),
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
  archiveProduct: (id) =>
    request(`/catalog/products/${id}/archive/`, {
      method: 'POST',
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
  deleteVariant: (id) =>
    request(`/catalog/variants/${id}/`, {
      method: 'DELETE',
    }),
  archiveVariant: (id) =>
    request(`/catalog/variants/${id}/archive/`, {
      method: 'POST',
    }),
};

export const inventoryApi = {
  getStock: (page = 1, search = '') => {
    let q = `?page=${page}`;
    if (search) q += `&search=${encodeURIComponent(search)}`;
    return request(`/inventory/stock/${q}`);
  },
  getStockDetail: (variantId) => request(`/inventory/stock/${variantId}/`),
  getMovements: (page = 1) => request(`/inventory/movements/?page=${page}`),
  stockIntake: (data) =>
    request('/inventory/intake/', {
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
};

export const salesApi = {
  getSales: (page = 1, search = '') => {
    let q = `?page=${page}`;
    if (search) q += `&search=${encodeURIComponent(search)}`;
    return request(`/sales/${q}`);
  },
  getSaleDetail: (id) => request(`/sales/${id}/`),
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
  getCounterparty: (id) => request(`/sales/counterparties/${id}/`),
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
  getCurrentShift: () => request('/cashbox/shift/current/'),
  closeShift: (data) =>
    request('/cashbox/shift/close/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getExpenses: () => request('/cashbox/expenses/'),
  createExpense: (data) =>
    request('/cashbox/expenses/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getIncome: () => request('/cashbox/income/'),
  createIncome: (data) =>
    request('/cashbox/income/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReports: (page = 1) => request(`/cashbox/reports/?page=${page}`),
  getReportDetail: (id) => request(`/cashbox/reports/${id}/`),
};

export const auditApi = {
  getLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.action) query.append('action', params.action);
    if (params.actor) query.append('actor', params.actor);
    if (params.target_model) query.append('target_model', params.target_model);
    const qs = query.toString();
    return request(`/audit/logs/${qs ? `?${qs}` : ''}`);
  },
};

