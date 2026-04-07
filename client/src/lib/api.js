import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== "undefined") {
            const statusCode = error?.response?.status;
            const currentPath = window.location.pathname;

            if (statusCode === 401 && currentPath.startsWith("/admin")) {
                if (currentPath !== "/admin/login") {
                    window.location.assign("/admin/login");
                }
            }
        }

        return Promise.reject(error);
    },
);
