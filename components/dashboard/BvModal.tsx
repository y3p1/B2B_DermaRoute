"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Step1ClinicalInfo,
  ClinicalInfoForm,
} from "./BVSteps/Step1ClinicalInfo";
import {
  Step2PatientDelivery,
  PatientDeliveryForm,
} from "./BVSteps/Step2PatientDelivery";
import { Step3Recommendation } from "./BVSteps/Step3Recommendation";

export type BVStep = 1 | 2 | 3;

export type BVFormData = Partial<ClinicalInfoForm & PatientDeliveryForm>;

export default function BVModal({
  open,
  onOpenChange,
  onCreated,
  initialData,
  id,
  mode = "create",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  initialData?: BVFormData;
  id?: string;
  mode?: "create" | "edit";
}) {
  const [step, setStep] = React.useState<BVStep>(1);
  const [formData, setFormData] = React.useState<BVFormData>(initialData ?? {});

  const handleNext = (
    data: Partial<ClinicalInfoForm & PatientDeliveryForm>,
  ) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep((s) => (s < 3 ? ((s + 1) as BVStep) : s));
  };
  const handleBack = () => setStep((s) => (s > 1 ? ((s - 1) as BVStep) : s));
  const handleClose = () => {
    setStep(1);
    setFormData({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[80vw] max-w-[80vw] sm:max-w-none p-0 max-h-[98vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">
            New Benefits Verification
          </DialogTitle>
        </DialogHeader>
        {step === 1 && (
          <Step1ClinicalInfo
            onNext={handleNext}
            onClose={handleClose}
            defaultValues={formData}
          />
        )}
        {step === 2 && (
          <Step2PatientDelivery
            onNext={handleNext}
            onBack={handleBack}
            defaultValues={formData}
          />
        )}
        {step === 3 && (
          <Step3Recommendation
            onBack={handleBack}
            onClose={handleClose}
            formData={formData}
            onCreated={onCreated}
            id={id}
            mode={mode}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
