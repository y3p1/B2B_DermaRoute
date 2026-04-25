import React from "react";
import AgreementPage1 from "./AgreementPage1";
import AgreementPage2 from "./AgreementPage2";
import AgreementPage3 from "./AgreementPage3";
import AgreementPage4 from "./AgreementPage4";
import AgreementPage5 from "./AgreementPage5";
import AgreementPage6 from "./AgreementPage6";
import SignatureCanvas from "react-signature-canvas";
import type { UseFormReturn, SubmitHandler } from "react-hook-form";
import type { SignatureData } from "../SignupStep3Agreement";

interface AgreementPagesProps {
  coveredEntityValue: string;
  onCoveredEntityChange: (value: string) => void;
  form: UseFormReturn<SignatureData>;
  coveredEntitySigPad: React.RefObject<SignatureCanvas | null>;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  canvasWidth: number;
  onBack: () => void;
  onSubmit: SubmitHandler<SignatureData>;
}

export default function AgreementPages({
  coveredEntityValue,
  onCoveredEntityChange,
  form,
  coveredEntitySigPad,
  canvasContainerRef,
  canvasWidth,
  onBack,
  onSubmit,
}: AgreementPagesProps) {
  return (
    <>
      <AgreementPage1
        coveredEntityValue={coveredEntityValue}
        onCoveredEntityChange={onCoveredEntityChange}
      />
      <AgreementPage2 />
      <AgreementPage3 />
      <AgreementPage4 />
      <AgreementPage5 />
      <AgreementPage6
        coveredEntityValue={coveredEntityValue}
        onCoveredEntityChange={onCoveredEntityChange}
        form={form}
        coveredEntitySigPad={coveredEntitySigPad}
        canvasContainerRef={canvasContainerRef}
        canvasWidth={canvasWidth}
        onBack={onBack}
        onSubmit={onSubmit}
      />
    </>
  );
}
