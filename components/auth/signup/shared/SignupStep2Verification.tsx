"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import SignupStepper from "./SignupStepper";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import BackButton from "@/components/BackButton";
import { ApiError, apiPost } from "@/lib/apiClient";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const codeSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});

interface SignupStep2Props {
  phone: string;
  onNext: () => void;
  onBack: () => void;
  steps?: string[];
  title?: string;
}

export default function SignupStep2Verification({
  phone,
  onNext,
  onBack,
  steps,
  title,
}: SignupStep2Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  // Format phone for display (masked), resilient to international formats.
  const displayPhone = (() => {
    const digits = (phone ?? "").replace(/\D/g, "");
    if (digits.length < 4) return "No phone provided";

    const last4 = digits.slice(-4);
    const isUS11 = digits.length === 11 && digits.startsWith("1");
    const isUS10 = digits.length === 10;
    if (isUS10 || isUS11) return `(XXX) XXX-${last4}`;

    return `••• ${last4}`;
  })();

  const friendlyRateLimit =
    "Rate limited: too many verification attempts. Try again after 10 minutes.";

  function formatVerifyOtpError(err: unknown): string {
    if (err instanceof ApiError && err.status === 429) return friendlyRateLimit;

    const message = err instanceof Error ? err.message : "";
    if (/max\s+check\s+attempts\s+reached/i.test(message))
      return friendlyRateLimit;
    if (/too\s+many\s+attempts/i.test(message)) return friendlyRateLimit;
    if (/\b60202\b/.test(message)) return friendlyRateLimit;

    return message || "Invalid or expired code";
  }

  const handleVerifyCode = async (values: z.infer<typeof codeSchema>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await apiPost<
        { success: true; data?: unknown },
        { phone: string; code: string; mode: "signup" }
      >("/api/verify-otp", { phone, code: values.code, mode: "signup" });
      onNext();
    } catch (err) {
      setError(formatVerifyOtpError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={!!error}
        onOpenChange={(open) => {
          if (!open) setError(null);
        }}
      >
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Unable to verify code</DialogTitle>
            <DialogDescription>
              {error || "Please try again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full max-w-md p-8">
        {/* Back Button */}
        <BackButton onClick={onBack} />
        <IntegrityTissueLogo />

        {/* Progress Steps */}
        <div className="my-4">
          <SignupStepper currentStep={2} steps={steps} title={title} />
        </div>

        <div className="bg-white rounded-xl mb-4">
          <div className="text-center text-gray-600 mb-2">Code sent to</div>
          <div className="text-center font-bold text-lg text-black">
            {displayPhone}
          </div>
          <div className="text-center text-gray-500 mb-6">sent the code</div>
          <Form {...codeForm}>
            <form
              onSubmit={codeForm.handleSubmit(handleVerifyCode)}
              className="space-y-4"
            >
              <FormField
                control={codeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">
                      Verification Code
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        className="w-full py-6 text-center tracking-widest text-3xl bg-gray-100 border border-gray-300 rounded-lg text-black outline-none"
                        disabled={isSubmitting}
                        {...field}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
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
                {isSubmitting ? "Verifying..." : "Verify & Continue"}
              </Button>
              <button
                type="button"
                onClick={onBack}
                className="block w-full text-center text-gray-600 text-base underline bg-transparent border-none cursor-pointer mt-2"
              >
                &larr; Different number
              </button>
            </form>
          </Form>
        </div>
      </div>
    </>
  );
}
