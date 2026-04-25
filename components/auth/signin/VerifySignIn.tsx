"use client";

import React from "react";
import { useRouter } from "next/navigation";
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
import { useAuthStore } from "@/store/auth";

const codeSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});

interface VerifySignInProps {
  phone: string;
  isSubmitting?: boolean;
  isLocked?: boolean;
  lockMessage?: string | null;
  onBack?: () => void;
  onVerify?: (code: string) => void;
}

export default function VerifySignIn({
  phone,
  isSubmitting,
  isLocked,
  lockMessage,
  onBack,
  onVerify,
}: VerifySignInProps) {
  const authStatus = useAuthStore((s) => s.status);
  const router = useRouter();
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

  const handleVerifyCode = async (values: z.infer<typeof codeSchema>) => {
    if (onVerify) {
      onVerify(values.code);
    }
  };

  return authStatus !== "authenticated" ? (
    <Form {...codeForm}>
      <div className="bg-white rounded-xl mb-4">
        <div className="text-center text-muted-foreground mb-2">
          Code sent to
        </div>
        <div className="text-center font-bold text-lg text-black">
          {displayPhone}
        </div>
        <div className="text-center text-muted-foreground text-sm mb-6">
          sent the code
        </div>
        <form
          onSubmit={codeForm.handleSubmit(handleVerifyCode)}
          className="space-y-4"
        >
          <FormField
            control={codeForm.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification Code</FormLabel>
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
            disabled={isSubmitting || !!isLocked}
            className="w-full text-lg py-4 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors"
          >
            {isSubmitting ? "Verifying..." : "Verify & Sign In"}
          </Button>
          {lockMessage ? (
            <p className="text-muted-foreground text-xs mt-2 text-left">
              {lockMessage}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onBack ? onBack : () => router.replace("/")}
            className="block w-full text-center text-muted-foreground text-base underline bg-transparent border-none cursor-pointer mt-2"
          >
            &larr; Different number
          </button>
        </form>
      </div>
    </Form>
  ) : null;
}
