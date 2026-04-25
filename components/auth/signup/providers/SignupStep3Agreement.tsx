"use client";

import React, { useState, useRef, useEffect } from "react";
// Dialog imports removed
// Button import removed
// Tooltip imports removed
import { Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import AgreementPDF from "./agreement/AgreementPDF";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import SignatureCanvas from "react-signature-canvas";
import AgreementPages from "./agreement/AgreementPages";
import SignupStepper from "@/components/auth/signup/shared/SignupStepper";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import BackButton from "@/components/BackButton";

interface SignupStep3Props {
  onNext: (signatureData: SignatureData | null) => void;
  onBack: () => void;
}

const signatureSchema = z.object({
  coveredEntity: z.string().min(1, "Covered Entity is required"),
  coveredEntityName: z.string().min(1, "Name is required"),
  coveredEntitySignature: z.string().min(1, "Signature is required"),
  coveredEntityTitle: z.string().min(1, "Title is required"),
  coveredEntityDate: z.string().min(1, "Date is required"),
  integritySolutionsSignature: z.string().optional(),
  businessAssociateName: z.string().optional(),
  businessAssociateSignature: z.string().optional(),
  businessAssociateTitle: z.string().optional(),
  businessAssociateDate: z.string().optional(),
  agreementStatus: z.enum(["Pending", "Signed"]).optional(),
});

export type SignatureData = z.infer<typeof signatureSchema>;

export default function SignupStep3Agreement({
  onNext,
  onBack,
}: SignupStep3Props) {
  // printError state removed
  const [currentPage, setCurrentPage] = useState(1);
  const [canvasWidth, setCanvasWidth] = useState(400);
  // Removed showPrintDialog and agreeData state

  // Refs for signature pads (must be inside the component)
  const coveredEntitySigPad = useRef<SignatureCanvas>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<SignatureData>({
    resolver: zodResolver(signatureSchema),
    defaultValues: {
      coveredEntity: "",
      coveredEntityName: "",
      coveredEntitySignature: "",
      coveredEntityTitle: "",
      coveredEntityDate: new Date().toLocaleDateString("en-US", {
        timeZone: "America/New_York",
      }),
      integritySolutionsSignature: "",
      businessAssociateName: "Integrity Tissue Solutions",
      agreementStatus: "Pending", // Default status
      businessAssociateSignature: "",
      businessAssociateTitle: "",
      businessAssociateDate: "",
    },
  });

  const coveredEntityValue = useWatch({
    control: form.control,
    name: "coveredEntity",
  });

  // PDF download handler (must be inside component to access form)
  const downloadPDFAndContinue = async () => {
    const values = form.getValues();
    try {
      // Defensive: ensure AgreementPDF is defined and all props are present
      if (!AgreementPDF) throw new Error("AgreementPDF component not found");
      const element = (
        <AgreementPDF
          coveredEntity={values.coveredEntity}
          coveredEntityName={values.coveredEntityName}
          coveredEntitySignature={values.coveredEntitySignature}
          coveredEntityTitle={values.coveredEntityTitle}
          coveredEntityDate={values.coveredEntityDate}
        />
      );
      const blob = await pdf(element).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Business_Associate_Agreement_${
        values.coveredEntity?.replace(/\s+/g, "_") || "document"
      }.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      // After download, go to next step without signature data
      onNext(null);
    } catch {
      alert("Failed to generate PDF. Please try again or contact support.");
    }
  };

  // Resize canvas to match container width
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        const containerWidth = canvasContainerRef.current.offsetWidth - 8; // Account for padding
        setCanvasWidth(containerWidth > 0 ? containerWidth : 400);
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollPercentage =
      (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;

    // Update page based on scroll position
    if (scrollPercentage < 16) setCurrentPage(1);
    else if (scrollPercentage < 33) setCurrentPage(2);
    else if (scrollPercentage < 50) setCurrentPage(3);
    else if (scrollPercentage < 66) setCurrentPage(4);
    else if (scrollPercentage < 83) setCurrentPage(5);
    else setCurrentPage(6);
  };

  const handleAgreeAndContinue = (values: SignatureData) => {
    onNext(values);
  };

  // handleDialogYes and handleDialogNo removed

  return (
    <div className="w-full px-8 py-4">
      {/* Back Button */}
      <BackButton onClick={onBack} />
      <div className="w-full h-full flex flex-col">
        {/* Agreement Document Card */}
        <div className="flex-1 bg-white rounded-lg flex flex-col overflow-hidden min-h-175">
          {/* Logo Section */}
          <div className="flex justify-center text-center my-4">
            <IntegrityTissueLogo />
          </div>

          {/* Progress Steps */}
          <div className="my-4">
            <SignupStepper currentStep={3} title="Create Provider Account" />
          </div>

          {/* Instruction and Download PDF Button */}
          <div className="mb-6 flex flex-col items-center">
            <div className="font-bold text-base text-center text-gray-800 mb-2">
              Note:
              <br />
              For doctors who wish to review the BAA physically, you may click
              the{" "}
              <span className="inline-block font-semibold">
                Print Document
              </span>{" "}
              button.
              <br />
              <br />
              If you choose to sign a printed copy, please provide the signed
              document directly to your representative. You will receive further
              instructions after your account creation form is submitted.
            </div>
            <button
              type="button"
              onClick={downloadPDFAndContinue}
              className="flex items-center gap-2 px-5 py-2 font-semibold rounded shadow mt-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download size={20} /> Print Document
            </button>
            {/* Print Document Dialog removed */}
          </div>

          {/* Document Header */}
          <div className="bg-gray-100 px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-xl font-semibold text-black">
              Business Associate Agreement
            </h3>
            <span className="text-sm text-gray-600">
              Page {currentPage} of 6
            </span>
          </div>

          {/* Scrollable Content */}
          <div
            className="flex-1 overflow-y-auto px-2 py-10"
            style={{ minHeight: 500, maxHeight: "calc(80vh - 120px)" }}
            onScroll={handleScroll}
          >
            <AgreementPages
              coveredEntityValue={coveredEntityValue}
              onCoveredEntityChange={(value: string) =>
                form.setValue("coveredEntity", value)
              }
              form={form}
              coveredEntitySigPad={coveredEntitySigPad}
              canvasContainerRef={canvasContainerRef}
              canvasWidth={canvasWidth}
              onBack={onBack}
              onSubmit={handleAgreeAndContinue}
            />
            {/* End of agreement pages */}
          </div>
        </div>
      </div>
    </div>
  );
}
