"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import SignupStepper from "@/components/auth/signup/shared/SignupStepper";
import BackButton from "@/components/BackButton";

import { ApiError, apiPost } from "@/lib/apiClient";
import { ALLOW_INTERNATIONAL_PHONE } from "@/lib/featureFlags";
import { useAuthStore } from "@/store/auth";

type CreateStep = 1 | 2 | 3;
type AdminRole = "admin" | "clinic_staff";

const phoneRegex = ALLOW_INTERNATIONAL_PHONE ? /^\+\d{10,15}$/ : /^\+1\d{10}$/;
const phoneError = ALLOW_INTERNATIONAL_PHONE
  ? "Phone must be in E.164 format (e.g., +15551234567)"
  : "Enter a valid US phone number";

const adminAccountCreateSchema = z.object({
  role: z.enum(["clinic_staff", "admin"]),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Valid email address is required"),
  accountPhone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(phoneRegex, phoneError),
});

type AdminAccountCreateForm = z.infer<typeof adminAccountCreateSchema>;

function formatCreateError(err: unknown): {
  title: string;
  description: string;
} {
  const fallback =
    err instanceof Error ? err.message : "Failed to create account";

  const apiData =
    err instanceof ApiError && err.data && typeof err.data === "object"
      ? (err.data as { code?: unknown; details?: unknown })
      : null;

  const apiCode =
    apiData && typeof apiData.code === "string" ? apiData.code : null;
  const apiDetails =
    apiData && typeof apiData.details === "string" && apiData.details.trim()
      ? apiData.details
      : null;

  if (apiCode === "EMAIL_ALREADY_REGISTERED") {
    return {
      title: "Email already registered",
      description: apiDetails ?? fallback,
    };
  }
  if (apiCode === "PHONE_ALREADY_REGISTERED") {
    return {
      title: "Phone number already registered",
      description: apiDetails ?? fallback,
    };
  }

  if (err instanceof ApiError) {
    return {
      title: "Create failed",
      description: apiDetails ?? err.message ?? fallback,
    };
  }

  return { title: "Create failed", description: apiDetails ?? fallback };
}

function Step1Details({
  defaultValues,
  allowedRoles,
  onNext,
}: {
  defaultValues?: Partial<AdminAccountCreateForm>;
  allowedRoles: AdminRole[];
  onNext: (data: AdminAccountCreateForm) => void;
}) {
  const form = useForm<AdminAccountCreateForm>({
    resolver: zodResolver(adminAccountCreateSchema),
    defaultValues: {
      role: "clinic_staff",
      firstName: "",
      lastName: "",
      email: "",
      accountPhone: "",
      ...defaultValues,
    },
  });

  const watchedRole = form.watch("role");
  const title =
    watchedRole === "admin"
      ? "Create Admin Account"
      : "Create Clinic Staff Account";

  const fixedRole: AdminRole | null =
    allowedRoles.length === 1 ? allowedRoles[0] : null;

  React.useEffect(() => {
    if (fixedRole) {
      form.setValue("role", fixedRole, { shouldDirty: false });
    }
  }, [fixedRole, form]);

  return (
    <div className="w-full max-w-md px-8 py-4">
      <div className="bg-white rounded-lg p-0">
        <IntegrityTissueLogo />
        <div className="my-4">
          <SignupStepper
            currentStep={1}
            steps={["Account Details", "Review", "Success"]}
            title={title}
          />
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => onNext(values))}
            className="space-y-4"
          >
            {fixedRole ? (
              <div className="text-sm">
                <div className="text-black font-medium">Role</div>
                <div className="mt-1 inline-flex px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">
                  {fixedRole === "admin" ? "Admin" : "Clinic Staff"}
                </div>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black flex items-center gap-1">
                      Role <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(val) => field.onChange(val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedRoles.includes("clinic_staff") ? (
                            <SelectItem value="clinic_staff">
                              Clinic Staff
                            </SelectItem>
                          ) : null}
                          {allowedRoles.includes("admin") ? (
                            <SelectItem value="admin">Admin</SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black flex items-center gap-1">
                      First Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jane"
                        className="bg-gray-100 border border-gray-300 text-black"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black flex items-center gap-1">
                      Last Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        className="bg-gray-100 border border-gray-300 text-black"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black flex items-center gap-1">
                    Email Address <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="jane@example.com"
                      className="bg-gray-100 border border-gray-300 text-black"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black flex items-center gap-1">
                    Mobile Phone Number <span className="text-red-500">*</span>
                  </FormLabel>
                  <div className="text-xs text-gray-500 mb-1">
                    Must be able to receive OTP codes
                  </div>
                  <FormControl>
                    <PhoneInput
                      country={"us"}
                      onlyCountries={
                        ALLOW_INTERNATIONAL_PHONE ? undefined : ["us"]
                      }
                      value={field.value ? field.value.replace(/^\+/, "") : ""}
                      onChange={(val) => field.onChange(val ? `+${val}` : "")}
                      inputClass="!w-full !pl-12 !pr-3 !py-3 !bg-gray-100 !border !border-gray-300 !rounded !text-black !text-base !outline-none"
                      buttonClass="!bg-gray-100"
                      inputProps={{ name: field.name, required: true }}
                      enableSearch={ALLOW_INTERNATIONAL_PHONE}
                      disableDropdown={!ALLOW_INTERNATIONAL_PHONE}
                      countryCodeEditable={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

function Step2Review({
  values,
  onBack,
  onCreate,
  isSubmitting,
  error,
  onDismissError,
}: {
  values: AdminAccountCreateForm;
  onBack: () => void;
  onCreate: () => void;
  isSubmitting: boolean;
  error: { title: string; description: string } | null;
  onDismissError: () => void;
}) {
  const title =
    values.role === "admin"
      ? "Create Admin Account"
      : "Create Clinic Staff Account";

  return (
    <div className="w-full px-8 py-4">
      <Dialog
        open={!!error}
        onOpenChange={(open) => (!open ? onDismissError() : null)}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{error?.title ?? "Create failed"}</DialogTitle>
            <DialogDescription>
              {error?.description ?? "Please try again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BackButton onClick={onBack} />

      <div className="w-full h-full flex flex-col">
        <div className="flex-1 bg-white rounded-lg flex flex-col overflow-hidden min-h-175">
          <IntegrityTissueLogo />

          <div className="mt-8">
            <SignupStepper
              currentStep={2}
              steps={["Account Details", "Review", "Success"]}
              title={title}
            />
          </div>

          <h3 className="text-xl font-semibold text-black mb-4 text-center">
            Review Account Details
          </h3>

          <div className="space-y-6 px-2 pb-2">
            <div>
              <h4 className="font-semibold text-black mb-3 border-b pb-2">
                Account
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Role:</p>
                  <p className="text-black font-medium">
                    {values.role === "admin" ? "Admin" : "Clinic Staff"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Email:</p>
                  <p className="text-black font-medium">{values.email}</p>
                </div>
                <div>
                  <p className="text-gray-600">Phone:</p>
                  <p className="text-black font-medium">
                    {values.accountPhone}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Name:</p>
                  <p className="text-black font-medium">
                    {values.firstName} {values.lastName}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-600">
              After creation, the user can sign in with OTP using the phone
              number above.
            </div>
          </div>

          <div className="px-2 pb-6 mt-6 flex gap-3">
            <Button
              type="button"
              className="w-full"
              onClick={onCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3Success({
  onCreateAnother,
  backHref,
  backLabel,
  role,
}: {
  onCreateAnother: () => void;
  backHref: string;
  backLabel: string;
  role: "admin" | "clinic_staff";
}) {
  return (
    <div className="w-full px-8 py-4">
      <div className="w-full h-full flex flex-col justify-center items-center">
        <div className="flex-1 rounded-lg flex flex-col justify-center overflow-hidden min-h-175">
          <IntegrityTissueLogo />

          <div className="flex justify-center mt-8">
            <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-4">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-center font-bold text-4xl text-green-500 mb-4">
            Account created
          </h1>

          <div className="mb-12">
            <p className="text-xl text-black text-center">
              The new {role === "admin" ? "admin" : "clinic staff"} can now sign
              in with OTP using their phone number.
            </p>
          </div>

          <div className="flex flex-col gap-3 justify-center items-center">
            <Button
              type="button"
              onClick={onCreateAnother}
              className="w-full max-w-xs bg-black hover:bg-gray-800 text-white text-lg py-6 rounded-full"
            >
              Create another
            </Button>
            <Button
              asChild
              className="w-full max-w-xs bg-gray-300 hover:bg-gray-400 hover:text-white text-gray-800 text-lg py-6 rounded-full"
            >
              <Link href={backHref}>{backLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserCreateClient({
  allowedRoles = ["clinic_staff", "admin"],
  backLabel = "Back to dashboard",
}: {
  allowedRoles?: AdminRole[];
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const currentRole = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.jwt);

  // Set backHref based on currentRole
  const backHref = currentRole === "admin" ? "/admin" : "/clinic-staff";

  const [step, setStep] = React.useState<CreateStep>(1);
  const [details, setDetails] = React.useState<AdminAccountCreateForm | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<null | {
    title: string;
    description: string;
  }>(null);

  React.useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth");
  }, [router, status]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (currentRole !== "admin") router.replace(backHref);
  }, [backHref, currentRole, router, status]);

  const handleCreate = async () => {
    if (!details) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (!token) {
        setError({
          title: "Not signed in",
          description: "Please sign in as an admin to create accounts.",
        });
        return;
      }

      await apiPost<
        { message: string; user_id: string },
        {
          role: "admin" | "clinic_staff";
          firstName: string;
          lastName: string;
          email: string;
          accountPhone: string;
        }
      >(
        "/api/admin-accounts",
        {
          role: details.role,
          firstName: details.firstName,
          lastName: details.lastName,
          email: details.email,
          accountPhone: details.accountPhone,
        },
        { token },
      );

      setStep(3);
    } catch (e) {
      setError(formatCreateError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "idle" || status === "loading") {
    return <div className="min-h-screen bg-[#1a1a2e]" />;
  }

  return (
    <div className="w-screen min-h-screen flex flex-col items-center bg-[#1a1a2e]">
      <div className="w-full max-w-md my-8 mx-auto p-0 rounded-lg shadow-lg bg-card flex flex-col items-center justify-center">
        <div className="w-full">
          {step === 1 ? (
            <Step1Details
              defaultValues={details ?? undefined}
              allowedRoles={allowedRoles}
              onNext={(data) => {
                setDetails(data);
                setStep(2);
              }}
            />
          ) : null}

          {step === 2 && details ? (
            <Step2Review
              values={details}
              onBack={() => setStep(1)}
              onCreate={handleCreate}
              isSubmitting={isSubmitting}
              error={error}
              onDismissError={() => setError(null)}
            />
          ) : null}

          {step === 3 ? (
            <Step3Success
              onCreateAnother={() => {
                setDetails(null);
                setError(null);
                setIsSubmitting(false);
                setStep(1);
              }}
              backHref={backHref}
              backLabel={backLabel}
              role={details?.role ?? "clinic_staff"}
            />
          ) : null}
        </div>

        {step !== 3 && (
          <div className="text-center mb-4">
            <Link
              href={backHref}
              className="text-primary underline text-sm hover:text-primary/80"
            >
              {backLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
