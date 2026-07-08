import type { Request, Response } from "../http/types";

import { getProviderProfileByUserId } from "../services/bvRequests.service";
import { getAdminProfileByUserId } from "../services/adminAcct.service";
import { getClinicStaffProfileByUserId, getClinicStaffById } from "../services/clinicStaffAcct.service";
import {
  updateProviderProfile,
  updateProviderProfileSchema,
} from "../services/providerAcct.service";
import { getEnabledTracks } from "../services/tracks.service";
import { isDemoMode, getDemoUser, DEMO_ROLE_TRACKS, type DemoRole } from "../../lib/demoMode";
import { getDemoProviderTracks } from "../services/demoTracks.service";

const DEMO_CLINIC_NAMES: Record<string, string> = {
  provider:        "Cedar Hills Wound Center",
  provider_wound2: "Summit Wound Specialists",
  provider_ocular: "Coastal Eye Clinic",
};

const DEMO_PROVIDER_NAMES: Record<string, { first: string; last: string }> = {
  provider:        { first: "Jordan", last: "Rivera" },
  provider_wound2: { first: "Casey", last: "Morrison" },
  provider_ocular: { first: "Taylor", last: "Nguyen" },
};

export async function meController(_req: Request, res: Response) {
  if (isDemoMode()) {
    const demoRole = (res.locals.demoRole ?? "provider") as DemoRole;
    const { userId, user: demoUser } = getDemoUser(demoRole);
    const du = demoUser as { email: string };
    const isProvider = ["provider", "provider_wound2", "provider_ocular"].includes(demoRole);

    // Resolve tracks from DB for provider roles, falling back to hardcoded constant
    let tracks: string[] = DEMO_ROLE_TRACKS[demoRole] ?? [];
    if (isProvider) {
      try {
        const dbTracks = await getDemoProviderTracks(du.email);
        if (dbTracks !== null) {
          tracks = dbTracks;
        }
      } catch {
        // Fall back to hardcoded tracks if DB lookup fails
      }
    }

    const providerMock = isProvider
      ? {
          id: userId,
          accountPhone: "+10000000000",
          email: du.email,
          npiNumber: "0000000000",
          clinicName: DEMO_CLINIC_NAMES[demoRole] ?? "Demo Clinic",
          clinicAddress: "123 Demo St",
          clinicCity: "Demo City",
          clinicState: "CA",
          clinicZip: "90000",
          clinicPhone: null,
          providerSpecialty: null,
          taxId: null,
          groupNpi: null,
          role: "provider",
          userId,
          active: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          ...( DEMO_PROVIDER_NAMES[demoRole] ? { firstName: DEMO_PROVIDER_NAMES[demoRole].first, lastName: DEMO_PROVIDER_NAMES[demoRole].last } : {} ),
        }
      : null;

    const adminMock = !isProvider
      ? {
          id: userId,
          accountPhone: "+10000000000",
          email: du.email,
          firstName: demoRole === "admin" ? "Morgan" : "Alex",
          lastName: demoRole === "admin" ? "Chen" : "Patel",
          role: demoRole === "admin" ? "admin" : "clinic_staff",
          userId,
          active: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        }
      : null;

    const assignedRep = isProvider
      ? { firstName: "Alex", lastName: "Patel", accountPhone: "+15550001003", email: "demo-clinicstaff@dermaroute-demo.example.com" }
      : null;

    return res.json({
      success: true,
      data: {
        user: { id: userId, email: du.email, phone: null, user_metadata: { role: demoRole } },
        accountType: isProvider ? "provider" : "admin",
        role: isProvider ? "provider" : demoRole === "admin" ? "admin" : "clinic_staff",
        provider: providerMock,
        admin: adminMock,
        assignedRep,
        enabledTracks: tracks,
      },
    });
  }

  const user = res.locals.user as
    | {
      id: string;
      email?: string;
      phone?: string;
      user_metadata?: Record<string, unknown>;
    }
    | undefined;

  if (!user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const provider = await getProviderProfileByUserId(user.id);
  const admin = provider ? null : await getAdminProfileByUserId(user.id);
  const clinicStaff =
    provider || admin ? null : await getClinicStaffProfileByUserId(user.id);

  if (!provider && !admin && !clinicStaff) {
    return res
      .status(403)
      .json({ error: "No provider or admin profile found" });
  }

  const accountType: "provider" | "admin" = provider || clinicStaff
    ? "provider"
    : "admin";
  const role = (provider?.role ?? admin?.role ?? "clinic_staff") as string;

  const adminLike = admin
    ? admin
    : clinicStaff
      ? {
        ...clinicStaff,
        role: "clinic_staff",
      }
      : null;

  const enabledTracks = provider ? await getEnabledTracks(provider.id) : [];

  const assignedRep = provider?.assignedRepId
    ? await getClinicStaffById(provider.assignedRepId)
    : null;

  return res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        user_metadata: user.user_metadata ?? null,
      },
      accountType,
      role,
      provider,
      admin: adminLike,
      assignedRep,
      enabledTracks,
    },
  });
}

export async function updateMeProviderController(req: Request, res: Response) {
  const user = res.locals.user as
    | { id: string }
    | undefined;

  if (!user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Verify this user is a provider
  const provider = await getProviderProfileByUserId(user.id);
  if (!provider) {
    return res.status(403).json({ error: "Only providers can update their profile" });
  }

  const body = req.body;
  const parsed = updateProviderProfileSchema.safeParse(body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const updated = await updateProviderProfile(user.id, parsed.data);
  if (!updated) {
    return res.status(500).json({ error: "Failed to update profile" });
  }

  return res.json({ success: true, data: updated });
}
