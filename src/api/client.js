import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/token/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  registerEmail: (email) => api.post('/auth/register/email/', { email }),
  verifyCode: (email, code) => api.post('/auth/register/verify-code/', { email, code }),
  registerProfile: (data) => api.post('/auth/register/profile/', data),
  registerAvatar: (registrationToken, photo) => {
    const form = new FormData();
    form.append('registration_token', registrationToken);
    form.append('photo', photo);
    return api.post('/auth/register/avatar/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  registerComplete: (registrationToken) =>
    api.post('/auth/register/complete/', { registration_token: registrationToken }),
  login: (email, password) => api.post('/auth/login/', { email, password }),
  me: () => api.get('/auth/me/'),
};

export const chatsApi = {
  list: () => api.get('/chats/'),
  messages: (chatId, params) => api.get(`/chats/${chatId}/messages/`, { params }),
  start: (recipientId) => api.post('/chats/start/', { recipient_id: recipientId }),
  searchUsers: (q) => api.get('/users/search/', { params: { q } }),
};
