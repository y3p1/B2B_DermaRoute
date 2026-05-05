import React from "react";
import AgreementPage2 from "@/components/auth/signup/providers/agreement/AgreementPage2";
import AgreementPage3 from "@/components/auth/signup/providers/agreement/AgreementPage3";
import AgreementPage4 from "@/components/auth/signup/providers/agreement/AgreementPage4";
import AgreementPage5 from "@/components/auth/signup/providers/agreement/AgreementPage5";
import AdminBaaAgreementPage6 from "./AdminBaaAgreementPage6";
import SignatureCanvas from "react-signature-canvas";

interface AdminBaaAgreementPagesProps {
  // Covered Entity (Provider) data - read only
  coveredEntity: string;
  coveredEntityName: string;
  coveredEntitySignatureUrl: string | null;
  coveredEntityTitle: string;
  coveredEntityDate: string;

  // Business Associate (Admin/Clinic Staff) data - editable in edit mode
  businessAssociateName: string;
  businessAssociateTitle: string;
  businessAssociateDate: string;

  onBusinessAssociateNameChange: (value: string) => void;
  onBusinessAssociateTitleChange: (value: string) => void;
  onBusinessAssociateDateChange: (value: string) => void;

  businessAssociateSigPad: React.RefObject<SignatureCanvas | null>;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  canvasWidth: number;

  onClearSignature: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;

  // For view mode (read-only)
  isViewMode?: boolean;
  businessAssociateSignatureUrl?: string | null;
}

export default function AdminBaaAgreementPages(
  props: AdminBaaAgreementPagesProps,
) {
  const {
    coveredEntity,
    coveredEntityName,
    coveredEntitySignatureUrl,
    coveredEntityTitle,
    coveredEntityDate,
    businessAssociateName,
    businessAssociateTitle,
    businessAssociateDate,
    onBusinessAssociateNameChange,
    onBusinessAssociateTitleChange,
    onBusinessAssociateDateChange,
    businessAssociateSigPad,
    canvasContainerRef,
    canvasWidth,
    onClearSignature,
    onSave,
    onCancel,
    saving,
    isViewMode = false,
    businessAssociateSignatureUrl,
  } = props;

  // For pages 1-5, we show coveredEntity as read-only text, not an editable input
  const dummyOnChange = () => {}; // No-op for read-only mode

  return (
    <>
      {/* Pages 1-5 show the agreement text with covered entity filled in (read-only) */}
      <div className="mb-8 min-h-[80vh]">
        <div className="space-y-4 text-sm text-black leading-relaxed">
          <p>
            This Business Associate Agreement (the &quot;Agreement&quot;), is
            hereby made by and between{" "}
            <span className="inline-block px-3 py-1 bg-gray-100 border border-gray-300 rounded">
              {coveredEntity || "N/A"}
            </span>{" "}
            (&quot;Covered Entity&quot;) and Derma Route
            (&quot;Business Associate&quot;), each individually a
            &quot;Party&quot; and together the &quot;Parties.&quot;
          </p>
          <p>
            <strong>A.</strong> The purpose of this Agreement is to comply with
            the business associate requirements of the Standards for Privacy of
            Individually Identifiable Health Information (&quot;Privacy
            Regulations,&quot; 45 CFR Part 160, 162, and 164, Subparts A and E),
            the Standards for Security of Electronic Protected Health
            Information (&quot;Security Regulations&quot;, 45 CFR Parts 160,
            162, and 164, Subpart C) (collectively referred to as &quot;HIPAA
            Regulations&quot;), contained in the Health Insurance Portability
            and Accountability Act of 1996 (&quot;HIPAA&quot;) (45 C.F.R. parts
            160 and 164), as amended by the Health Information Technology for
            Economic and Clinical Health Act (&quot;HITECH&quot;).
          </p>
          <p>
            <strong>B.</strong> Covered Entity and Business Associate have
            entered into this Agreement because Business Associate may receive
            and/or create certain Protected Health Information
            (&quot;PHI&quot;), as that term is defined or certain services (the
            &quot;Services&quot;) for Covered Entity, such as consultation,
            eligibility determination, or other activities related to the
            medical devices, supplies, therapeutics, and other products covered
            by Business Associate. For clarity, the Services do not include
            conducting insurance checks, precertifications, appeals, grievances,
            or any insurance-related activities on behalf of Covered Entity or
            patients.
          </p>
          <p>
            <strong>C.</strong> The Privacy Regulations require Covered Entity
            to obtain written assurances from Business Associate that Business
            Associate will appropriately safeguard the PHI.
          </p>
        </div>
      </div>

      <AgreementPage2 />
      <AgreementPage3 />
      <AgreementPage4 />
      <AgreementPage5 />

      {/* Page 6 with signature section */}
      <AdminBaaAgreementPage6
        coveredEntity={coveredEntity}
        coveredEntityName={coveredEntityName}
        coveredEntitySignatureUrl={coveredEntitySignatureUrl}
        coveredEntityTitle={coveredEntityTitle}
        coveredEntityDate={coveredEntityDate}
        businessAssociateName={businessAssociateName}
        businessAssociateTitle={businessAssociateTitle}
        businessAssociateDate={businessAssociateDate}
        onBusinessAssociateNameChange={onBusinessAssociateNameChange}
        onBusinessAssociateTitleChange={onBusinessAssociateTitleChange}
        onBusinessAssociateDateChange={onBusinessAssociateDateChange}
        businessAssociateSigPad={businessAssociateSigPad}
        canvasContainerRef={canvasContainerRef}
        canvasWidth={canvasWidth}
        onClearSignature={onClearSignature}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
        isViewMode={isViewMode}
        businessAssociateSignatureUrl={businessAssociateSignatureUrl}
      />
    </>
  );
}
