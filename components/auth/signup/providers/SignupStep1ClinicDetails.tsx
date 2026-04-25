"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import SignupStepper from "@/components/auth/signup/shared/SignupStepper";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { ApiError, apiPost } from "@/lib/apiClient";
import { providerSpecialties } from "@/shared/providerSpecialties";
import { ALLOW_INTERNATIONAL_PHONE } from "@/lib/featureFlags";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

const phoneRegex = ALLOW_INTERNATIONAL_PHONE ? /^\+\d{10,15}$/ : /^\+1\d{10}$/;
const phoneError = ALLOW_INTERNATIONAL_PHONE
  ? "Phone must be in E.164 format (e.g., +15551234567)"
  : "Enter a valid US phone number";

function formatSendOtpError(err: unknown): {
  title: string;
  description: string;
  steps?: string[];
  helpUrl?: string;
} {
  const friendlyRateLimit =
    "Rate limited: max OTP send attempts reached. Try again after 10 minutes.";

  if (err instanceof ApiError && err.status === 429) {
    const data = err.data;
    if (data && typeof data === "object") {
      const code = (data as { code?: unknown }).code;
      if (code === "TWILIO_VERIFY_BLOCKED") {
        const details =
          typeof (data as { details?: unknown }).details === "string"
            ? (data as { details: string }).details
            : err.message;
        const nextSteps = Array.isArray(
          (data as { nextSteps?: unknown }).nextSteps,
        )
          ? (data as { nextSteps: unknown[] }).nextSteps
              .filter((x): x is string => typeof x === "string")
              .filter((x) => x.trim().length > 0)
          : [];
        const helpUrl =
          typeof (data as { helpUrl?: unknown }).helpUrl === "string"
            ? (data as { helpUrl: string }).helpUrl
            : undefined;

        return {
          title: "Phone number temporarily blocked",
          description: details,
          steps: nextSteps.length ? nextSteps : undefined,
          helpUrl,
        };
      }
    }

    return { title: "Please wait", description: friendlyRateLimit };
  }

  const message = err instanceof Error ? err.message : "";
  if (/max\s+send\s+attempts\s+reached/i.test(message)) {
    return { title: "Please wait", description: friendlyRateLimit };
  }
  if (/\b60203\b/.test(message)) {
    return { title: "Please wait", description: friendlyRateLimit };
  }

  return {
    title: "Unable to continue",
    description: message || "Failed to send verification code",
  };
}

const accountPhoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(phoneRegex, phoneError);

const clinicDetailsSchema = z.object({
  accountPhone: accountPhoneSchema,
  email: z.string().email("Valid email address is required"),
  npiNumber: z
    .string()
    .regex(/^\d{10}$/, "NPI number must be exactly 10 digits"),
  clinicName: z.string().min(2, "Clinic/Practice name is required"),
  clinicAddress: z.string().optional(),
  clinicPhone: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === "" || phoneRegex.test(val), {
      message: phoneError,
    }),
  providerSpecialty: z
    .union([z.literal(""), z.enum(providerSpecialties)])
    .optional(),
  taxId: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === "" || /^\d{2}-?\d{7}$/.test(val), {
      message: "Tax ID must look like 12-3456789",
    }),
  groupNpi: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === "" || /^\d{10}$/.test(val), {
      message: "Group NPI must be exactly 10 digits",
    }),
});

export type ClinicDetailsForm = z.infer<typeof clinicDetailsSchema>;

export interface SignupStep1Props {
  onNext: (data: ClinicDetailsForm) => void;
  defaultValues?: Partial<ClinicDetailsForm>;
}
function SignupStep1ClinicDetails(props: SignupStep1Props) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<null | {
    title: string;
    description: string;
    steps?: string[];
    helpUrl?: string;
  }>(null);

  const form = useForm<ClinicDetailsForm>({
    resolver: zodResolver(clinicDetailsSchema),
    defaultValues: props.defaultValues || {
      accountPhone: "",
      email: "",
      npiNumber: "",
      clinicName: "",
      clinicAddress: "",
      clinicPhone: "",
      providerSpecialty: "",
      taxId: "",
      groupNpi: "",
    },
  });

  const handleSubmit = async (values: ClinicDetailsForm) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await apiPost<
        { success: true } | { success: true; data?: unknown },
        { phone: string; mode: "signup" }
      >("/api/send-otp", { phone: values.accountPhone, mode: "signup" });
      props.onNext(values);
    } catch (err) {
      setSubmitError(formatSendOtpError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md px-8 py-4">
      <Dialog
        open={!!submitError}
        onOpenChange={(open) => {
          if (!open) setSubmitError(null);
        }}
      >
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {submitError?.title ?? "Unable to continue"}
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-3">
                <p>
                  {submitError?.description ||
                    "Something went wrong. Please try again."}
                </p>
                {submitError?.steps?.length ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {submitError.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                ) : null}
                {submitError?.helpUrl ? (
                  <p>More info: {submitError.helpUrl}</p>
                ) : null}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-lg p-0">
        {/* Logo and Title */}
        <IntegrityTissueLogo />
        {/* Progress Steps */}
        <div className="my-4">
          <SignupStepper currentStep={1} title="Create Provider Account" />
        </div>
        {/* Form */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Account Phone Number (required) */}
            <FormField
              control={form.control}
              name="accountPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black flex items-center gap-1">
                    Account Phone Number <span className="text-red-500">*</span>
                  </FormLabel>
                  <div className="text-xs text-gray-500 mb-1">
                    Must be able to receive text messages or OTP codes
                  </div>
                  <div>
                    <PhoneInput
                      country={"us"}
                      onlyCountries={
                        ALLOW_INTERNATIONAL_PHONE ? undefined : ["us"]
                      }
                      value={field.value ? field.value.replace(/^\+/, "") : ""}
                      onChange={(val) => field.onChange(val ? `+${val}` : "")}
                      inputClass="!w-full !pl-12 !pr-3 !py-3 !bg-gray-100 !border !border-gray-300 !rounded !text-black !text-base !outline-none"
                      buttonClass="!bg-gray-100"
                      inputProps={{
                        name: field.name,
                        required: true,
                        autoFocus: false,
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
            {/* Email Address (required) */}
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
                      {...field}
                      type="email"
                      placeholder=""
                      className="bg-gray-100 border-gray-300 text-black"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* NPI Number (required, exactly 10 digits) */}
            <FormField
              control={form.control}
              name="npiNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black flex items-center gap-1">
                    NPI Number <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="10-digit NPI"
                      className="bg-gray-100 border-gray-300 text-black"
                      maxLength={10}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Clinic/Practice Name (required) */}
            <FormField
              control={form.control}
              name="clinicName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black flex items-center gap-1">
                    Clinic/Practice Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="(text input, required)"
                      className="bg-gray-100 border-gray-300 text-black"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Clinic Address (optional) */}
            <FormField
              control={form.control}
              name="clinicAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">
                    Clinic Address (optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="street, city, state, ZIP"
                      className="bg-gray-100 border-gray-300 text-black"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Clinic Phone Number (optional) */}
            <FormField
              control={form.control}
              name="clinicPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">
                    Clinic Phone Number (optional)
                  </FormLabel>
                  <div>
                    <PhoneInput
                      country={"us"}
                      onlyCountries={
                        ALLOW_INTERNATIONAL_PHONE ? undefined : ["us"]
                      }
                      value={
                        field.value && field.value !== "+1"
                          ? field.value.replace(/^\+/, "")
                          : ""
                      }
                      onChange={(val) => {
                        // If user leaves it as '+1' or empty, treat as empty string
                        if (!val || val === "1") {
                          field.onChange("");
                        } else {
                          field.onChange(val ? `+${val}` : "");
                        }
                      }}
                      inputClass="!w-full !pl-12 !pr-3 !py-3 !bg-gray-100 !border !border-gray-300 !rounded !text-black !text-base !outline-none"
                      buttonClass="!bg-gray-100"
                      inputProps={{
                        name: field.name,
                        required: false,
                        autoFocus: false,
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
            {/* Physician Specialty (optional) */}
            <FormField
              control={form.control}
              name="providerSpecialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">
                    Physician Specialty (optional)
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ""}
                      onValueChange={(val) =>
                        field.onChange(val === "__none__" ? "" : val)
                      }
                    >
                      <SelectTrigger className="bg-gray-100 border-gray-300 text-black">
                        <SelectValue placeholder="Select specialty (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">(none)</SelectItem>
                        {providerSpecialties.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Tax ID (EIN) (optional) */}
            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">
                    Tax ID (EIN) (optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="12-3456789"
                      inputMode="numeric"
                      className="bg-gray-100 border-gray-300 text-black"
                      maxLength={10}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 9);
                        const formatted =
                          digits.length <= 2
                            ? digits
                            : `${digits.slice(0, 2)}-${digits.slice(2)}`;
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Format: 12-3456789 (we’ll auto-format)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Group NPI (optional) */}
            <FormField
              control={form.control}
              name="groupNpi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">
                    Group NPI (optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="10-digit Group NPI"
                      inputMode="numeric"
                      className="bg-gray-100 border-gray-300 text-black"
                      maxLength={10}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Exactly 10 digits (numbers only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gray-300 hover:bg-gray-400 hover:text-white text-gray-800 text-lg py-6 rounded-lg"
              >
                {isSubmitting ? "Sending code..." : "Continue"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default SignupStep1ClinicDetails;
