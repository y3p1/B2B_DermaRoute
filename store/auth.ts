import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import { ApiError, apiGet } from "@/lib/apiClient";
import {
  isClientDemoMode,
  setDemoRoleCookie,
  type DemoRole,
} from "@/lib/demoMode";

type MeResponse = {
  success: true;
  data: {
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      user_metadata: Record<string, unknown> | null;
    };
    accountType: "provider" | "admin";
    role: string;
    provider: {
      id: string;
      accountPhone: string;
      email: string;
      npiNumber: string;
      clinicName: string;
      clinicAddress: string | null;
      clinicPhone: string | null;
      providerSpecialty: string | null;
      taxId: string | null;
      groupNpi: string | null;
      role: string;
      userId: string;
      active: boolean;
      createdAt: string | null;
      updatedAt: string | null;
    } | null;
    admin: {
      id: string;
      accountPhone: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      userId: string;
      active: boolean;
      createdAt: string | null;
      updatedAt: string | null;
    } | null;
  };
};

type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";

interface AuthState {
  status: AuthStatus;
  jwt: string | null;
  user: MeResponse["data"]["user"] | null;
  provider: MeResponse["data"]["provider"] | null;
  admin: MeResponse["data"]["admin"] | null;
  role: string | null;
  accountType: MeResponse["data"]["accountType"] | null;
  error: string | null;

  setJwt: (jwt: string | null) => void;
  setAuthenticated: (payload: {
    jwt: string;
    user: MeResponse["data"]["user"];
    provider: MeResponse["data"]["provider"];
    admin: MeResponse["data"]["admin"];
    role: string;
    accountType: MeResponse["data"]["accountType"];
  }) => void;
  clear: () => void;

  hydrate: () => Promise<void>;
  switchDemoRole: (role: DemoRole) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  jwt: null,
  user: null,
  provider: null,
  admin: null,
  role: null,
  accountType: null,
  error: null,

  setJwt: (jwt) => set({ jwt }),
  setAuthenticated: ({ jwt, user, provider, admin, role, accountType }) =>
    set({
      status: "authenticated",
      jwt,
      user,
      provider,
      admin,
      role,
      accountType,
      error: null,
    }),
  clear: () =>
    set({
      status: "unauthenticated",
      jwt: null,
      user: null,
      provider: null,
      admin: null,
      role: null,
      accountType: null,
      error: null,
    }),

  hydrate: async () => {
    if (isClientDemoMode()) {
      const currentStatus = get().status;
      if (currentStatus === "idle") {
        set({ status: "loading", error: null });
      }
      try {
        // Browser sends demo_role cookie automatically; server reads it in requireAuth
        const me = await apiGet<MeResponse>("/api/me");
        set({
          status: "authenticated",
          jwt: "demo-token",
          user: me.data.user,
          provider: me.data.provider,
          admin: me.data.admin,
          role: me.data.role,
          accountType: me.data.accountType,
          error: null,
        });
      } catch {
        set({
          status: "unauthenticated",
          jwt: null,
          user: null,
          provider: null,
          admin: null,
          role: null,
          accountType: null,
          error: null,
        });
      }
      return;
    }

    const currentStatus = get().status;
    if (currentStatus === "idle") {
      set({ status: "loading", error: null });
    } else {
      set({ error: null });
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      set({
        status: "error",
        error: error.message,
        jwt: null,
        user: null,
        provider: null,
        admin: null,
        role: null,
        accountType: null,
      });
      return;
    }

    const token = data.session?.access_token;

    if (!token) {
      set({
        status: "unauthenticated",
        jwt: null,
        user: null,
        provider: null,
        admin: null,
        role: null,
        accountType: null,
        error: null,
      });
      return;
    }

    try {
      const me = await apiGet<MeResponse>("/api/me", { token });

      set({
        status: "authenticated",
        jwt: token,
        user: me.data.user,
        provider: me.data.provider,
        admin: me.data.admin,
        role: me.data.role,
        accountType: me.data.accountType,
        error: null,
      });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        set({
          status: "unauthenticated",
          jwt: null,
          user: null,
          provider: null,
          admin: null,
          role: null,
          accountType: null,
          error: null,
        });
        return;
      }
      const message = e instanceof Error ? e.message : "Failed to load profile";

      set({
        status: "error",
        error: message,
        jwt: token,
        user: null,
        provider: null,
        admin: null,
        role: null,
        accountType: null,
      });
    }
  },

  switchDemoRole: async (role) => {
    if (!isClientDemoMode()) return;

    setDemoRoleCookie(role);
    set({
      status: "loading",
      jwt: "demo-token",
      user: null,
      provider: null,
      admin: null,
      role: null,
      accountType: null,
      error: null,
    });

    await get().hydrate();
  },

  logout: async () => {
    if (isClientDemoMode()) {
      document.cookie = "demo_role=; path=/; max-age=0";
      window.location.href = "/demo";
      return;
    }
    await supabase.auth.signOut();
    set({
      status: "unauthenticated",
      jwt: null,
      user: null,
      provider: null,
      admin: null,
      role: null,
      accountType: null,
      error: null,
    });
  },
}));
