"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import VerifySignIn from "./VerifySignIn";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import { ApiError, apiPost } from "@/lib/apiClient";
import { isClientDemoMode } from "@/lib/demoMode";
import { useAuthStore } from "@/store/auth";
import { ALLOW_INTERNATIONAL_PHONE } from "@/lib/featureFlags";
import {
  formatMsRemaining,
  getSendStatus,
  getVerifyLock,
  recordSendAttempt,
  recordVerifyFailure,
  recordVerifySuccess,
} from "@/lib/otpClientGuard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { addRecentPhone, getLastSuccessfulPhone } from "@/lib/recentPhones";

const phoneSchema = z.object({
  phone: ALLOW_INTERNATIONAL_PHONE
    ? z
        .string()
        .regex(
          /^\+\d{10,15}$/,
          "Phone must be in E.164 format (e.g., +15551234567)",
        )
    : z
        .string()
        .min(12, "Phone number is required")
        .regex(/^\+1\d{10}$/, "Enter a valid US phone number"),
});

export default function AuthComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<
    "provider" | "clinic_staff" | null
  >(null);
  const [stage, setStage] = useState<"selectRole" | "enterPhone" | "enterCode">(
    "selectRole",
  );
  const [submittedPhone, setSubmittedPhone] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, forceTick] = useState(0);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [useDifferentNumber, setUseDifferentNumber] = useState(false);
  const [error, setError] = useState<null | {
    title: string;
    description: string;
    cta?: { label: string; href: string };
  }>(null);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const authStatus = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "provider" || roleParam === "clinic_staff") {
      setSelectedRole(roleParam);
      setStage("enterPhone");
    }
  }, [searchParams]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      if (role === "admin") {
        router.replace("/admin");
      } else if (role === "clinic_staff") {
        router.replace("/clinic-staff");
      } else {
        router.replace("/");
      }
    }
  }, [authStatus, role, router]);

  // Phone form
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  // Load last successful phone and default to read-only unless user opts out.
  useEffect(() => {
    let last = getLastSuccessfulPhone();
    if (last && !last.startsWith("+")) {
      // Auto-fix older numeric-only saved phones to have the plus.
      last = last.startsWith("1") ? "+" + last : "+1" + last;
    }
    setSavedPhone(last);

    const current = phoneForm.getValues("phone");
    if (last && (!current || !current.trim())) {
      phoneForm.setValue("phone", last, { shouldDirty: false });
    }

    setUseDifferentNumber(!last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render once per second so countdown labels update.
  useEffect(() => {
    const id = window.setInterval(() => forceTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const currentPhone =
    stage === "enterPhone"
      ? phoneForm.watch("phone")
      : stage === "enterCode"
        ? submittedPhone
        : "";
  const sendStatus = currentPhone ? getSendStatus(currentPhone) : null;
  const verifyLock = submittedPhone ? getVerifyLock(submittedPhone) : null;
  // No need for codeForm here, handled in VerifySignInPage

  // No longer need formatPhoneNumber, handled by PhoneInput

  const handleSendCode = async (values: z.infer<typeof phoneSchema>) => {
    if (isClientDemoMode()) {
      setError({
        title: "Demo mode",
        description: "Sign-in is illustrative only. Use the role switcher in the banner to explore the portal.",
      });
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      if (!selectedRole) {
        setError({
          title: "Choose a role",
          description: "Please choose Provider or Clinic Staff to continue.",
        });
        return;
      }

      const sendStatus = getSendStatus(values.phone);
      if (!sendStatus.allowed) {
        setError({
          title: "Please wait",
          description: `Too many code requests. Try again in ${formatMsRemaining(
            sendStatus.retryAt,
          )}.`,
        });
        return;
      }

      // Count the attempt before calling the server so hammering is blocked even
      // when the server rejects or the phone isn't registered.
      recordSendAttempt(values.phone);

      setSubmittedPhone(values.phone);
      await apiPost<
        { success: true } | { success: true; data?: unknown },
        { phone: string; mode: "signin"; role?: "provider" | "clinic_staff" }
      >("/api/send-otp", {
        phone: values.phone,
        mode: "signin",
        role: selectedRole ?? undefined,
      });

      // If we got here without throwing, the OTP was sent.
      {
        setStage("enterCode");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404 && err.message === "Phone is not registered") {
          setError({
            title: "Phone number not registered",
            description:
              "We couldn’t find an account for this phone number. Please register or try a different number.",
            cta: { label: "Register", href: "/signup" },
          });
          return;
        }

        if (err.status === 429) {
          const retryAfterSeconds =
            typeof err.data === "object" &&
            err.data &&
            "retryAfterSeconds" in err.data &&
            typeof (err.data as { retryAfterSeconds?: unknown })
              .retryAfterSeconds === "number"
              ? (err.data as { retryAfterSeconds: number }).retryAfterSeconds
              : null;

          const retryAtFromBody =
            typeof err.data === "object" &&
            err.data &&
            "retryAt" in err.data &&
            typeof (err.data as { retryAt?: unknown }).retryAt === "number"
              ? (err.data as { retryAt: number }).retryAt
              : null;

          const retryAt =
            retryAtFromBody ??
            (retryAfterSeconds != null
              ? Date.now() + retryAfterSeconds * 1000
              : null);

          setError({
            title: "Please wait",
            description: retryAt
              ? `${err.message} Try again in ${formatMsRemaining(retryAt)}.`
              : err.message || "Please wait before requesting another code.",
          });
          return;
        }

        setError({
          title: "Sign-in failed",
          description: err.message || "Please try again.",
        });
        return;
      }

      const message =
        err instanceof Error ? err.message : "Network error. Please try again.";
      setError({ title: "Sign-in failed", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove handleVerifyCode, handled in VerifySignInPage

  return authStatus !== "authenticated" ? (
    <div className="w-screen relative flex items-center justify-center bg-[#1a1a2e]" style={{ minHeight: "100vh" }}>
      <footer className="absolute bottom-4 w-full flex justify-center gap-4 text-xs font-medium text-[#8c8c9b]">
        <Link href="/legal/privacy-policy" target="_blank" className="hover:text-white transition">Privacy Policy</Link>
        <span>&bull;</span>
        <Link href="/legal/terms-of-service" target="_blank" className="hover:text-white transition">Terms of Service</Link>
      </footer>
      <Dialog
        open={!!error}
        onOpenChange={(open) => {
          if (!open) setError(null);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{error?.title ?? "Sign-in failed"}</DialogTitle>
            <DialogDescription>
              {error?.description ?? "Please try again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {error?.cta ? (
              <Button asChild variant="secondary">
                <Link href={error.cta.href}>{error.cta.label}</Link>
              </Button>
            ) : null}
            <DialogClose asChild>
              <Button type="button">OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full max-w-md p-8 rounded-lg shadow-lg bg-card">
        <IntegrityTissueLogo />
        {stage === "selectRole" ? (
          <>
            <h1 className="text-black font-bold text-3xl mb-6 mt-4 text-center">
              Sign in
            </h1>
            <p className="text-black/80 font-bold my-6 text-center">
              Are you signing in as a Provider/Clinic Staff or ITS Representative?
            </p>
            <div className="flex flex-col gap-4 w-full">
              <button
                className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold shadow hover:bg-neutral-800 transition"
                onClick={() => {
                  setSelectedRole("provider");
                  setStage("enterPhone");
                }}
                type="button"
              >
                I am a Provider/Clinic Staff
              </button>
              <button
                className="w-full px-6 py-3 bg-white text-black rounded-lg font-semibold shadow hover:bg-neutral-100 transition"
                onClick={() => {
                  setSelectedRole("clinic_staff");
                  setStage("enterPhone");
                }}
                type="button"
              >
                I am an ITS Representative
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-black font-bold text-3xl mb-6 mt-4 text-center">
              {selectedRole === "clinic_staff"
                ? "ITS Representative Portal"
                : "Provider Portal"}
            </h1>

            <div className="mb-4 text-center">
              <button
                type="button"
                className="text-primary underline text-sm hover:text-primary/80"
                onClick={() => {
                  setSelectedRole(null);
                  setStage("selectRole");
                  setSubmittedPhone("");
                  setError(null);
                }}
                disabled={isSubmitting}
              >
                Choose a different role
              </button>
            </div>

            {stage === "enterPhone" ? (
              <Form {...phoneForm}>
                <form
                  onSubmit={phoneForm.handleSubmit(handleSendCode)}
                  className="space-y-4"
                >
                  {savedPhone && !useDifferentNumber ? (
                    <div className="space-y-2">
                      <FormLabel>Mobile Phone Number</FormLabel>
                      <Input value={savedPhone ?? ""} readOnly />
                      <button
                        type="button"
                        className="text-sm text-primary underline hover:text-primary/80 text-left"
                        onClick={() => setUseDifferentNumber(true)}
                        disabled={isSubmitting}
                      >
                        Use a different number
                      </button>
                    </div>
                  ) : (
                    <>
                      <FormField
                        control={phoneForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobile Phone Number</FormLabel>
                            <div>
                              <PhoneInput
                                country={"us"}
                                onlyCountries={
                                  ALLOW_INTERNATIONAL_PHONE ? undefined : ["us"]
                                }
                                value={field.value ? field.value.replace(/^\+/, "") : ""}
                                onChange={(val) =>
                                  field.onChange(val ? `+${val}` : "")
                                }
                                inputClass="!w-full !pl-12 !pr-3 !py-3 !bg-muted !border !border-border !rounded !text-foreground !text-base !outline-none"
                                buttonClass="!bg-muted"
                                disabled={isSubmitting}
                                inputProps={{
                                  name: field.name,
                                  required: true,
                                  autoFocus: true,
                                }}
                                enableSearch={ALLOW_INTERNATIONAL_PHONE}
                                disableDropdown={!ALLOW_INTERNATIONAL_PHONE}
                                countryCodeEditable={false}
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {savedPhone ? (
                        <button
                          type="button"
                          className="text-sm text-primary underline hover:text-primary/80 text-left"
                          onClick={() => {
                            phoneForm.setValue("phone", savedPhone, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            setUseDifferentNumber(false);
                          }}
                          disabled={isSubmitting}
                        >
                          Use saved number instead
                        </button>
                      ) : null}
                    </>
                  )}
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting || (sendStatus ? !sendStatus.allowed : false)
                    }
                    className="w-full mb-6"
                  >
                    {isSubmitting ? "Sending..." : "Send Verification Code"}
                  </Button>
                  {sendStatus && !sendStatus.allowed ? (
                    <p className="text-muted-foreground text-xs -mt-3">
                      Try again in {formatMsRemaining(sendStatus.retryAt)}.
                    </p>
                  ) : null}
                </form>
              </Form>
            ) : (
              <VerifySignIn
                phone={submittedPhone || phoneForm.getValues("phone")}
                isSubmitting={isSubmitting}
                isLocked={!!verifyLock?.locked}
                lockMessage={
                  verifyLock?.locked
                    ? `Too many attempts. Try again in ${formatMsRemaining(
                        verifyLock.retryAt,
                      )}.`
                    : null
                }
                onBack={() => {
                  setStage("enterPhone");
                  setSubmittedPhone("");
                  setError(null);
                }}
                onVerify={async (code) => {
                  setIsSubmitting(true);
                  setError(null);
                  try {
                    const phone =
                      submittedPhone || phoneForm.getValues("phone");

                    const verifyLock = getVerifyLock(phone);
                    if (verifyLock.locked) {
                      setError({
                        title: "Too many attempts",
                        description: `Too many failed verification attempts. Please wait ${formatMsRemaining(
                          verifyLock.retryAt,
                        )} and try again.`,
                      });
                      return;
                    }

                    const res = await apiPost<
                      {
                        success: true;
                        data?: {
                          session?: {
                            access_token: string;
                            refresh_token: string;
                          };
                        };
                      },
                      {
                        phone: string;
                        code: string;
                        mode: "signin";
                        role?: "provider" | "clinic_staff";
                      }
                    >("/api/verify-otp", {
                      phone,
                      code,
                      mode: "signin",
                      role: selectedRole ?? undefined,
                    });

                    if (!res || typeof res !== "object") {
                      setError({
                        title: "Sign-in failed",
                        description:
                          "Verification response was empty. Please try again.",
                      });
                      return;
                    }

                    const session = res.data?.session;
                    if (!session?.access_token || !session.refresh_token) {
                      setError({
                        title: "Sign-in failed",
                        description:
                          "Verification succeeded, but no session returned.",
                      });
                      return;
                    }

                    recordVerifySuccess(phone);

                    // Persist login in browser storage via Supabase client.
                    const { error: setSessionError } =
                      await supabase.auth.setSession({
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                      });

                    if (setSessionError) {
                      setError({
                        title: "Sign-in failed",
                        description:
                          setSessionError.message || "Failed to save session",
                      });
                      return;
                    }

                    // Populate Zustand user/provider state for the rest of the app.
                    await hydrateAuth();

                    const after = useAuthStore.getState();
                    if (after.status !== "authenticated") {
                      setError({
                        title: "Sign-in failed",
                        description:
                          after.error ||
                          "Signed in successfully, but your account is not authorized to access the provider dashboard.",
                      });
                      return;
                    }

                    // Store last successful phone for future sign-in convenience.
                    addRecentPhone(phone);

                    if (after.role === "admin") {
                      router.replace("/admin");
                    } else if (after.role === "clinic_staff") {
                      router.replace("/clinic-staff");
                    } else {
                      router.replace("/");
                    }
                  } catch (err) {
                    if (err instanceof ApiError) {
                      const phone =
                        submittedPhone || phoneForm.getValues("phone");

                      if (err.status === 429) {
                        const retryAfterSeconds =
                          typeof err.data === "object" &&
                          err.data &&
                          "retryAfterSeconds" in err.data &&
                          typeof (err.data as { retryAfterSeconds?: unknown })
                            .retryAfterSeconds === "number"
                            ? (err.data as { retryAfterSeconds: number })
                                .retryAfterSeconds
                            : null;

                        const retryAtFromBody =
                          typeof err.data === "object" &&
                          err.data &&
                          "retryAt" in err.data &&
                          typeof (err.data as { retryAt?: unknown }).retryAt ===
                            "number"
                            ? (err.data as { retryAt: number }).retryAt
                            : null;

                        const retryAt =
                          retryAtFromBody ??
                          (retryAfterSeconds != null
                            ? Date.now() + retryAfterSeconds * 1000
                            : null);

                        setError({
                          title: "Please wait",
                          description: retryAt
                            ? `${err.message} Try again in ${formatMsRemaining(
                                retryAt,
                              )}.`
                            : err.message ||
                              "Too many attempts. Please wait 10 minutes and try again.",
                        });
                        return;
                      }

                      if (err.status >= 400 && err.status < 500) {
                        recordVerifyFailure(phone);
                      }

                      setError({
                        title: "Verification failed",
                        description: err.message || "Please try again.",
                      });
                      return;
                    }
                    const message =
                      err instanceof Error
                        ? err.message
                        : "Network error. Please try again.";
                    setError({
                      title: "Verification failed",
                      description: message,
                    });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              />
            )}

            {selectedRole === "provider" || selectedRole === "clinic_staff" ? (
              <div className="mt-6 text-center">
                <span className="text-muted-foreground text-sm">
                  Don&apos;t have an account?{" "}
                </span>
                <Link
                  href={
                    selectedRole === "provider"
                      ? "/signup?role=provider"
                      : "/signup?role=clinic_staff"
                  }
                  className="text-primary underline text-sm hover:text-primary/80"
                >
                  Register
                </Link>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  ) : null;
}
