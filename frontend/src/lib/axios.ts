import axios from "axios";

// Use environment variable for API URL, fallback to localhost for development
const getBaseURL = () => {
	if (import.meta.env.VITE_API_URL) {
		return import.meta.env.VITE_API_URL;
	}
	return import.meta.env.MODE === "development" ? "http://localhost:5000/api" : "/api";
};

export const axiosInstance = axios.create({
	baseURL: getBaseURL(),
	timeout: 10000, // 10 second timeout
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(async (config) => {
	if ((window as any).Clerk && (window as any).Clerk.session) {
		try {
			const token = await (window as any).Clerk.session.getToken();
			if (token) {
				config.headers.Authorization = `Bearer ${token}`;
			}
		} catch (error) {
			console.error("Error getting auth token:", error);
		}
	}
	return config;
});

// Add response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.response?.status === 401) {
			// Try to refresh token automatically
			try {
				if ((window as any).Clerk && (window as any).Clerk.session) {
					const token = await (window as any).Clerk.session.getToken();
					if (token) {
						axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
						// Retry the original request
						error.config.headers.Authorization = `Bearer ${token}`;
						console.log("Token refreshed and request retried");
						return axiosInstance(error.config);
					}
				}
			} catch (refreshError) {
				console.log("Token refresh failed", refreshError);
			}

			// If refresh failed, clear token and show error
			delete axiosInstance.defaults.headers.common["Authorization"];
			console.error("Authentication failed. Please refresh the page.");
			// Don't show toast to avoid spam, just log to console
		}
		return Promise.reject(error);
	}
);
