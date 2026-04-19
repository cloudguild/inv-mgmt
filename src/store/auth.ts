import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserRole {
  role: string;
  projectId: string | null;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateToken: (accessToken: string) => void;
  isAdmin: () => boolean;
  isPM: (projectId?: string) => boolean;
  isLender: (projectId?: string) => boolean;
  isInvestor: (projectId?: string) => boolean;
  hasAnyPartnerRole: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
      updateToken: (accessToken) => set({ accessToken }),
      isAdmin: () => {
        const { user } = get();
        return user?.roles.some((r) => r.role === "admin") ?? false;
      },
      isPM: (projectId?: string) => {
        const { user } = get();
        if (!user) return false;
        return user.roles.some(
          (r) =>
            r.role === "admin" ||
            (r.role === "pm" && (!projectId || r.projectId === projectId))
        );
      },
      isLender: (projectId?: string) => {
        const { user } = get();
        if (!user) return false;
        return user.roles.some(
          (r) =>
            r.role === "lender" &&
            (!projectId || r.projectId === projectId)
        );
      },
      isInvestor: (projectId?: string) => {
        const { user } = get();
        if (!user) return false;
        return user.roles.some(
          (r) =>
            r.role === "investor" &&
            (!projectId || r.projectId === projectId)
        );
      },
      hasAnyPartnerRole: () => {
        const { user } = get();
        if (!user) return false;
        return user.roles.some((r) => r.role === "lender" || r.role === "investor");
      },
    }),
    { name: "auth-storage" }
  )
);
