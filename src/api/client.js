import axios from 'axios';
import { API_URL } from '../config';

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
    const url = original?.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login/') ||
      url.includes('/auth/register/') ||
      url.includes('/auth/token/refresh/');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
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
  updateProfile: (data) => api.patch('/auth/me/', data),
  updateAvatar: (photo) => {
    const form = new FormData();
    form.append('photo', photo);
    return api.post('/auth/me/avatar/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const chatsApi = {
  list: () => api.get('/chats/'),
  files: (chatId) => api.get(`/chats/${chatId}/files/`),
  messages: (chatId, params) => api.get(`/chats/${chatId}/messages/`, { params }),
  start: (recipientId) => api.post('/chats/start/', { recipient_id: recipientId }),
  searchUsers: (q) => api.get('/users/search/', { params: { q } }),
  uploadMessageFiles: (chatId, files, { onUploadProgress } = {}) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return api.post(`/chats/${chatId}/messages/upload/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
      onUploadProgress: (event) => {
        if (!onUploadProgress) return;
        if (event.total) {
          onUploadProgress(Math.round((event.loaded * 100) / event.total));
          return;
        }
        onUploadProgress(null);
      },
    });
  },
  deleteMessage: (chatId, messageId, scope) =>
    api.delete(`/chats/${chatId}/messages/${messageId}/`, { data: { scope } }),
  forwardMessages: (targetChatId, sourceChatId, messageIds, comment = '') =>
    api.post(`/chats/${targetChatId}/messages/forward/`, {
      source_chat_id: sourceChatId,
      message_ids: messageIds,
      comment,
    }),
  runCode: (chatId, messageId) =>
    api.post(`/chats/${chatId}/messages/${messageId}/run/`, null, { timeout: 30000 }),
  invitePrivate: (chatId) => api.post(`/chats/${chatId}/private/invite/`),
  acceptPrivate: (sessionId) => api.post(`/private/${sessionId}/accept/`),
  declinePrivate: (sessionId) => api.post(`/private/${sessionId}/decline/`),
  closePrivate: (sessionId) => api.post(`/private/${sessionId}/close/`),
  leavePrivate: () => api.post('/private/leave/'),
};

export const callsApi = {
  start: (chatId, data) => api.post(`/chats/${chatId}/calls/start/`, data),
  accept: (callId, data) => api.post(`/calls/${callId}/accept/`, data),
  reject: (callId, data) => api.post(`/calls/${callId}/reject/`, data),
  cancel: (callId, data) => api.post(`/calls/${callId}/cancel/`, data),
  hangup: (callId, data) => api.post(`/calls/${callId}/hangup/`, data),
  setMediaMode: (callId, data) => api.post(`/calls/${callId}/media-mode/`, data),
  active: () => api.get('/calls/active/'),
  iceConfig: () => api.get('/calls/ice-config/'),
};

export const notificationsApi = {
  list: () => api.get('/notifications/'),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/read-all/'),
  clear: () => api.delete('/notifications/clear/'),
  remove: (id) => api.delete(`/notifications/${id}/`),
};
