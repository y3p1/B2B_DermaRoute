import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import { ApiError, apiGet } from "@/lib/apiClient";

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
    // Only show loading state on initial load — not on silent re-hydrations
    // (e.g. token refresh on tab focus). Setting "loading" when already
    // authenticated causes shouldBlockRender to unmount the page, making it
    // appear as a full reload and wiping any form state.
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

  logout: async () => {
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
