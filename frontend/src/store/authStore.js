import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import toast from "react-hot-toast";

// Configure axios defaults
axios.defaults.baseURL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      // Actions
      login: async (credentials) => {
        try {
          set({ isLoading: true });

          const response = await axios.post("/auth/login", credentials);

          if (response.data.success) {
            const { token, user } = response.data.data;

            // Set token in axios headers
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });

            toast.success(`Welcome back, ${user.name}!`);
            return { success: true };
          }
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.message || "Login failed";
          toast.error(message);
          return { success: false, message };
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true });

          const response = await axios.post("/auth/register", userData);

          if (response.data.success) {
            const { token, user } = response.data.data;

            // Set token in axios headers
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });

            toast.success(`Welcome to TaskFlow Pro, ${user.name}!`);
            return { success: true };
          }
        } catch (error) {
          set({ isLoading: false });
          const message =
            error.response?.data?.message || "Registration failed";
          toast.error(message);
          return { success: false, message };
        }
      },

      logout: async () => {
        try {
          // Call logout endpoint if token exists
          if (get().token) {
            await axios.post("/auth/logout");
          }
        } catch (error) {
          // Ignore logout errors
          console.log("Logout error:", error);
        } finally {
          // Clear token from axios headers
          delete axios.defaults.headers.common["Authorization"];

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });

          toast.success("Logged out successfully");
        }
      },

      updateProfile: async (userData) => {
        try {
          const response = await axios.put("/auth/profile", userData);

          if (response.data.success) {
            set({
              user: response.data.data.user,
            });

            toast.success("Profile updated successfully");
            return { success: true };
          }
        } catch (error) {
          const message =
            error.response?.data?.message || "Profile update failed";
          toast.error(message);
          return { success: false, message };
        }
      },

      changePassword: async (passwordData) => {
        try {
          const response = await axios.post(
            "/auth/change-password",
            passwordData
          );

          if (response.data.success) {
            toast.success("Password changed successfully");
            return { success: true };
          }
        } catch (error) {
          const message =
            error.response?.data?.message || "Password change failed";
          toast.error(message);
          return { success: false, message };
        }
      },

      verifyToken: async () => {
        const token = get().token;

        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          // Set token in axios headers
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          // Verify token and get user profile
          const response = await axios.get("/auth/profile");

          if (response.data.success) {
            set({
              user: response.data.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            throw new Error("Token verification failed");
          }
        } catch (error) {
          console.log("Token verification failed:", error);

          // Clear invalid token
          delete axios.defaults.headers.common["Authorization"];
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // Initialize auth state
      initializeAuth: () => {
        const { token } = get();

        if (token) {
          get().verifyToken();
        } else {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        // Initialize auth after rehydration
        if (state) {
          state.initializeAuth();
        }
      },
    }
  )
);

// Axios response interceptor for handling token expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore.getState();

      // Only logout if currently authenticated to avoid redirect loops
      if (authStore.isAuthenticated) {
        authStore.logout();
        toast.error("Session expired. Please login again.");
      }
    }

    return Promise.reject(error);
  }
);

export { useAuthStore };
