"use client";

import * as React from "react";
import Link from "next/link";

import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import BackButton from "@/components/BackButton";
import SignupStepper from "@/components/auth/signup/shared/SignupStepper";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminProfileForm } from "./AdminSignupStep1Profile";

const steps = ["Profile", "Verification", "Summary"];

export interface AdminSignupStep3SummaryProps {
  profile: AdminProfileForm;
  onNext: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  error?: {
    title: string;
    description: string;
    cta?: { label: string; href: string };
  } | null;
  onDismissError?: () => void;
}

export default function AdminSignupStep3Summary({
  profile,
  onNext,
  onBack,
  isSubmitting,
  error,
  onDismissError,
}: AdminSignupStep3SummaryProps) {
  return (
    <div className="w-full px-8 py-4">
      <Dialog
        open={!!error}
        onOpenChange={(open) => {
          if (!open) onDismissError?.();
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{error?.title ?? "Signup failed"}</DialogTitle>
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

      <BackButton onClick={onBack} />

      <div className="w-full h-full flex flex-col">
        <div className="flex-1 bg-white rounded-lg flex flex-col overflow-hidden min-h-175">
          <IntegrityTissueLogo />

          <div className="mt-8">
            <SignupStepper
              currentStep={3}
              steps={steps}
              title="Create Admin Account"
            />
          </div>

          <h3 className="text-xl font-semibold text-black mb-4 text-center">
            Review Your Information
          </h3>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">First Name:</p>
                <p className="text-black font-medium">{profile.firstName}</p>
              </div>
              <div>
                <p className="text-gray-600">Last Name:</p>
                <p className="text-black font-medium">{profile.lastName}</p>
              </div>
              <div>
                <p className="text-gray-600">Email:</p>
                <p className="text-black font-medium">{profile.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Account Phone:</p>
                <p className="text-black font-medium">{profile.accountPhone}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              onClick={onNext}
              disabled={!!isSubmitting}
              className="w-full max-w-xs bg-gray-300 hover:bg-gray-400 hover:text-white text-gray-800 text-lg py-6 rounded-full"
            >
              {isSubmitting ? "Creating..." : "Create account"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
