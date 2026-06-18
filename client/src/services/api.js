import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/password', data),
  getUsers: (params) => api.get('/auth/users', { params }),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`)
};

export const orderAPI = {
  estimate: (data) => api.post('/orders/estimate', data),
  createOrder: (data) => api.post('/orders', data),
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  uploadOCR: (id, data) => api.post(`/orders/${id}/ocr`, data),
  uploadGPS: (id, data) => api.post(`/orders/${id}/gps`, data),
  reportException: (id, data) => api.post(`/orders/${id}/exception`, data)
};

export const riderAPI = {
  getStatus: () => api.get('/riders/status'),
  updateStatus: (data) => api.put('/riders/status', data),
  updateLocation: (data) => api.put('/riders/location', data),
  getOrders: (params) => api.get('/riders/orders', { params }),
  acceptOrder: (id) => api.post(`/riders/orders/${id}/accept`),
  pickupOrder: (id, data) => api.post(`/riders/orders/${id}/pickup`, data),
  departOrder: (id, data) => api.post(`/riders/orders/${id}/depart`, data),
  arriveOrder: (id, data) => api.post(`/riders/orders/${id}/arrive`, data),
  getWallet: () => api.get('/riders/wallet'),
  getStatistics: (params) => api.get('/riders/statistics', { params })
};

export const merchantAPI = {
  getProfile: () => api.get('/merchants/profile'),
  updateProfile: (data) => api.put('/merchants/profile', data),
  getStatistics: (params) => api.get('/merchants/statistics', { params }),
  getMerchants: (params) => api.get('/merchants', { params }),
  getMerchant: (id) => api.get(`/merchants/${id}`)
};

export const dispatchAPI = {
  getRecommendRiders: (orderId, params) => api.get(`/dispatch/recommend/${orderId}`, { params }),
  assignOrder: (data) => api.post('/dispatch/assign', data),
  autoDispatch: () => api.post('/dispatch/auto-dispatch'),
  getBatchOrders: (riderId) => api.get(`/dispatch/batch-orders/${riderId}`),
  getRealtimeRiders: (params) => api.get('/dispatch/realtime-riders', { params })
};

export const financeAPI = {
  getTransactions: (params) => api.get('/finance/transactions', { params }),
  exportTransactions: (params) => api.get('/finance/transactions/export', { params, responseType: 'blob' }),
  dailySettlement: (data) => api.post('/finance/settlement/daily', data),
  getSettlements: (params) => api.get('/finance/settlements', { params }),
  paySettlement: (id, data) => api.post(`/finance/settlements/${id}/pay`, data),
  getWallet: (riderId) => api.get(`/finance/wallet/${riderId}`),
  getStatistics: (params) => api.get('/finance/statistics', { params })
};

export const riskAPI = {
  getAlerts: (params) => api.get('/risk/alerts', { params }),
  getAlert: (id) => api.get(`/risk/alerts/${id}`),
  handleAlert: (id, data) => api.post(`/risk/alerts/${id}/handle`, data),
  checkRoute: (data) => api.post('/risk/check-route', data),
  checkStop: (data) => api.post('/risk/check-stop', data),
  getStatistics: (params) => api.get('/risk/statistics', { params })
};

export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getHeatmap: (params) => api.get('/dashboard/heatmap', { params }),
  getOrderTrend: (params) => api.get('/dashboard/order-trend', { params }),
  getRealtimeOrders: (params) => api.get('/dashboard/realtime-orders', { params }),
  getRealtimeAlerts: (params) => api.get('/dashboard/realtime-alerts', { params }),
  getRiderPerformance: (params) => api.get('/dashboard/rider-performance', { params })
};

export const communityAPI = {
  getCommunities: (params) => api.get('/community/communities', { params }),
  createCommunity: (data) => api.post('/community/communities', data),
  updateCommunity: (id, data) => api.put(`/community/communities/${id}`, data),
  deleteCommunity: (id) => api.delete(`/community/communities/${id}`),
  getResidents: (params) => api.get('/community/residents', { params }),
  createResident: (data) => api.post('/community/residents', data),
  updateResident: (id, data) => api.put(`/community/residents/${id}`, data),
  deleteResident: (id) => api.delete(`/community/residents/${id}`),
  getBuildings: (communityId) => api.get(`/community/buildings/${communityId}`),
  getHouses: (params) => api.get('/community/houses', { params }),
  getVisitors: (params) => api.get('/community/visitors', { params }),
  createVisitor: (data) => api.post('/community/visitors', data),
  updateVisitor: (id, data) => api.put(`/community/visitors/${id}`, data),
  deleteVisitor: (id) => api.delete(`/community/visitors/${id}`),
  approveVisitor: (id, data) => api.put(`/community/visitors/${id}/approve`, data),
  checkinVisitor: (id, data) => api.post(`/community/visitors/${id}/checkin`, data),
  checkoutVisitor: (id, data) => api.post(`/community/visitors/${id}/checkout`, data),
  getSecurityEvents: (params) => api.get('/community/security-events', { params }),
  createSecurityEvent: (data) => api.post('/community/security-events', data),
  updateSecurityEvent: (id, data) => api.put(`/community/security-events/${id}`, data),
  deleteSecurityEvent: (id) => api.delete(`/community/security-events/${id}`),
  handleSecurityEvent: (id, data) => api.put(`/community/security-events/${id}/handle`, data),
  getPropertyFees: (params) => api.get('/community/property-fees', { params }),
  createPropertyFee: (data) => api.post('/community/property-fees', data),
  updatePropertyFee: (id, data) => api.put(`/community/property-fees/${id}`, data),
  deletePropertyFee: (id) => api.delete(`/community/property-fees/${id}`),
  payPropertyFee: (id, data) => api.post(`/community/property-fees/${id}/pay`, data),
  getParkingSpaces: (params) => api.get('/community/parking-spaces', { params }),
  createParkingSpace: (data) => api.post('/community/parking-spaces', data),
  updateParkingSpace: (id, data) => api.put(`/community/parking-spaces/${id}`, data),
  deleteParkingSpace: (id) => api.delete(`/community/parking-spaces/${id}`),
  getAccessRecords: (params) => api.get('/community/access-records', { params }),
  createAccessRecord: (data) => api.post('/community/access-records', data),
  getStatistics: (params) => api.get('/community/statistics', { params })
};

export default api;
