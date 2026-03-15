import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

/* ─── Geolocation capture ─────────────────────────────────────── */
let geoLat = null;
let geoLng = null;

// Prompt browser for geolocation on load (non-blocking)
if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            geoLat = pos.coords.latitude.toFixed(7);
            geoLng = pos.coords.longitude.toFixed(7);
        },
        () => {
            // User denied or error — continue without geo
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
}

/* ─── Request interceptor — attach token + geolocation ────────── */
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Attach geolocation headers if available
        if (geoLat && geoLng) {
            config.headers['X-Geo-Lat'] = geoLat;
            config.headers['X-Geo-Lng'] = geoLng;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/* ─── Response interceptor — handle 401 + token refresh ──────── */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Queue the request while refreshing
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refresh_token');

            if (!refreshToken) {
                // No refresh token — redirect to login
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                const response = await axios.post('/api/auth/refresh/', {
                    refresh_token: refreshToken,
                });

                const { access_token, refresh_token: newRefreshToken } = response.data;

                localStorage.setItem('access_token', access_token);
                localStorage.setItem('refresh_token', newRefreshToken);

                originalRequest.headers.Authorization = `Bearer ${access_token}`;

                processQueue(null, access_token);
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
