"use client";

import * as React from "react";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import SignupStepper from "@/components/auth/signup/shared/SignupStepper";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, apiPost } from "@/lib/apiClient";
import { ALLOW_INTERNATIONAL_PHONE } from "@/lib/featureFlags";

const phoneRegex = ALLOW_INTERNATIONAL_PHONE ? /^\+\d{10,15}$/ : /^\+1\d{10}$/;
const phoneError = ALLOW_INTERNATIONAL_PHONE
  ? "Phone must be in E.164 format (e.g., +15551234567)"
  : "Enter a valid US phone number";

const steps = ["Profile", "Verification", "Summary"];

const profileSchema = z.object({
  accountPhone: z
    .string()
    .min(1, "Phone number is required")
    .regex(phoneRegex, phoneError),
  email: z.string().email("Valid email address is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export type ClinicStaffProfileForm = z.infer<typeof profileSchema>;

function formatSendOtpError(err: unknown): {
  title: string;
  description: string;
} {
  const friendlyRateLimit =
    "Rate limited: max OTP send attempts reached. Try again after 10 minutes.";

  if (err instanceof ApiError && err.status === 429) {
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

export interface ClinicStaffSignupStep1Props {
  onNext: (data: ClinicStaffProfileForm) => void;
  defaultValues?: Partial<ClinicStaffProfileForm>;
}

export default function ClinicStaffSignupStep1Profile({
  onNext,
  defaultValues,
}: ClinicStaffSignupStep1Props) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<null | {
    title: string;
    description: string;
  }>(null);

  const form = useForm<ClinicStaffProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      accountPhone: "",
      email: "",
      firstName: "",
      lastName: "",
      ...defaultValues,
    },
  });

  const handleSubmit = async (values: ClinicStaffProfileForm) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await apiPost<
        { success: true } | { success: true; data?: unknown },
        { phone: string; mode: "signup" }
      >("/api/send-otp", { phone: values.accountPhone, mode: "signup" });

      onNext(values);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {submitError?.title ?? "Unable to continue"}
            </DialogTitle>
            <DialogDescription>
              {submitError?.description ||
                "Something went wrong. Please try again."}
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
        <IntegrityTissueLogo />

        <div className="my-4">
          <SignupStepper
            currentStep={1}
            steps={steps}
            title="Create Clinic Staff Account"
          />
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
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
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jane"
                        className="bg-gray-100 border-gray-300 text-black"
                        disabled={isSubmitting}
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
                    <FormLabel className="text-black">Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        className="bg-gray-100 border-gray-300 text-black"
                        disabled={isSubmitting}
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
                  <FormLabel className="text-black">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@clinic.com"
                      className="bg-gray-100 border-gray-300 text-black"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full text-lg py-6 rounded-lg bg-gray-300 hover:bg-gray-400 hover:text-white text-gray-800 font-semibold"
            >
              {isSubmitting ? "Sending code..." : "Send code"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
