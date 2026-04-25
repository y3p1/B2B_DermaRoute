"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SignatureData } from "./SignupStep3Agreement";
import { ClinicDetailsForm } from "./SignupStep1ClinicDetails";
import SignupStepper from "@/components/auth/signup/shared/SignupStepper";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SignupStep4Props {
  clinicData: ClinicDetailsForm;
  signatureData?: SignatureData;
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

export default function SignupStep4Summary({
  clinicData,
  signatureData,
  onNext,
  onBack,
  isSubmitting,
  error,
  onDismissError,
}: SignupStep4Props) {
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

      {/* Back Button */}
      <BackButton onClick={onBack} />
      <div className="w-full h-full flex flex-col">
        {/* Summary Card */}
        <div className="flex-1 bg-white rounded-lg flex flex-col overflow-hidden min-h-175">
          {/* Logo Section */}
          <IntegrityTissueLogo />

          {/* Progress Steps */}
          <div className="mt-8">
            <SignupStepper currentStep={4} title="Create Provider Account" />
          </div>

          <h3 className="text-xl font-semibold text-black mb-4 text-center">
            Review Your Information
          </h3>

          <div className="space-y-6">
            {/* Provider Information FIRST */}
            <div>
              <h4 className="font-semibold text-black mb-3 border-b pb-2">
                Provider Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Account Phone Number:</p>
                  <p className="text-black font-medium">
                    {clinicData.accountPhone && clinicData.accountPhone.trim()
                      ? clinicData.accountPhone
                      : "N/A"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Must be able to receive text messages or OTP codes
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Email Address:</p>
                  <p className="text-black font-medium">
                    {clinicData.email && clinicData.email.trim()
                      ? clinicData.email
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Physician Specialty:</p>
                  <p className="text-black font-medium">
                    {clinicData.providerSpecialty &&
                    clinicData.providerSpecialty.trim()
                      ? clinicData.providerSpecialty
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Tax ID (EIN):</p>
                  <p className="text-black font-medium">
                    {clinicData.taxId && clinicData.taxId.trim()
                      ? clinicData.taxId
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Group NPI:</p>
                  <p className="text-black font-medium">
                    {clinicData.groupNpi && clinicData.groupNpi.trim()
                      ? clinicData.groupNpi
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Clinic Information SECOND */}
            <div>
              <h4 className="font-semibold text-black mb-3 border-b pb-2">
                Clinic Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Clinic/Practice Name:</p>
                  <p className="text-black font-medium">
                    {clinicData.clinicName && clinicData.clinicName.trim()
                      ? clinicData.clinicName
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Clinic Address:</p>
                  <p className="text-black font-medium">
                    {clinicData.clinicAddress && clinicData.clinicAddress.trim()
                      ? clinicData.clinicAddress
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Clinic Phone Number:</p>
                  <p className="text-black font-medium">
                    {clinicData.clinicPhone && clinicData.clinicPhone.trim()
                      ? clinicData.clinicPhone
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">NPI Number:</p>
                  <p className="text-black font-medium">
                    {clinicData.npiNumber && clinicData.npiNumber.trim()
                      ? clinicData.npiNumber
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Covered Entity Signature Information */}
            {signatureData ? (
              <>
                <div>
                  <h4 className="font-semibold text-black mb-3 border-b pb-2">
                    Covered Entity Signature
                  </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Organization/Clinic Name:</p>
                  <p className="text-black font-medium">
                    {signatureData.coveredEntity}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Name (Printed):</p>
                  <p className="text-black font-medium">
                    {signatureData.coveredEntityName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Title:</p>
                  <p className="text-black font-medium">
                    {signatureData.coveredEntityTitle}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Date:</p>
                  <p className="text-black font-medium">
                    {signatureData.coveredEntityDate}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Signature:</p>
                  {signatureData.coveredEntitySignature ? (
                    <Image
                      src={signatureData.coveredEntitySignature}
                      alt="Covered Entity Signature"
                      width={300}
                      height={64}
                      className="h-16 bg-gray-100 border border-gray-300 rounded mt-1"
                      style={{ maxWidth: "300px", maxHeight: "64px" }}
                    />
                  ) : (
                    <span className="text-gray-400">No signature provided</span>
                  )}
                </div>
              </div>
            </div>

            {/* Agreement Status */}
            <div>
              <h4 className="font-semibold text-black mb-3 border-b pb-2">
                Agreement Status
              </h4>
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-black font-medium">
                    Business Associate Agreement -{" "}
                    {signatureData.agreementStatus === "Signed"
                      ? "Signed"
                      : "Pending"}
                  </p>
                </div>
                <p className="text-gray-600 ml-7 mt-1">
                  Signed by {signatureData.coveredEntityName} on{" "}
                  {signatureData.coveredEntityDate}
                </p>
              </div>
            </div>
            </>
            ) : (
              <>
                <div>
                  <h4 className="font-semibold text-black mb-3 border-b pb-2">
                    Covered Entity Signature
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Document printed. Physical signature required.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-black mb-3 border-b pb-2">
                    Agreement Status
                  </h4>
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-black font-medium">
                        Business Associate Agreement - Pending Physical Signature
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <Button
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-lg py-6 rounded-lg"
          >
            Back
          </Button>
          <Button
            onClick={onNext}
            disabled={isSubmitting}
            className="flex-1 bg-gray-300 hover:bg-gray-400 hover:text-white text-gray-800 text-lg py-6 rounded-lg"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
