import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import SignatureCanvas from "react-signature-canvas";

interface AdminBaaAgreementPage6Props {
  // Covered Entity (Provider) data - read only
  coveredEntity: string;
  coveredEntityName: string;
  coveredEntitySignatureUrl: string | null;
  coveredEntityTitle: string;
  coveredEntityDate: string;

  // Business Associate (Admin/Clinic Staff) data - editable
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

export default function AdminBaaAgreementPage6(
  props: AdminBaaAgreementPage6Props,
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

  return (
    <div className="mb-8 min-h-[80vh] border-t pt-6">
      <div className="text-right text-sm text-gray-600 mb-4">Page 6 of 6</div>
      <div className="space-y-4 text-sm text-black leading-relaxed">
        <p>
          by hand delivery to such Party at its address given below or to such
          other address as shall be specified by the applicable party in the
          future:
        </p>
        <p className="ml-6">
          <strong>to Business Associate:</strong>
          <br />
          Derma Route, Attn: Privacy Officer
          <br />
          10 Hwy 98 STE 315 PMB#38 Bonaire, GA 31005
        </p>
        <p className="ml-6">
          <strong>to Covered Entity:</strong>
          <br />
          <span className="inline-block mt-1 text-gray-700">
            {coveredEntity || "N/A"}
          </span>
        </p>
        <p>
          <strong>10.6</strong> Entire Agreement. This Agreement constitutes the
          entire understanding among the parties with respect to this subject
          matter.
        </p>
        <p>
          <strong>10.7</strong> Interpretation. Any ambiguity in this Agreement
          shall be resolved to permit Covered Entity to comply with the HIPAA
          Regulations.
        </p>
        <p>
          <strong>10.8</strong> Choice of Law and Venue. This Agreement shall be
          governed by the laws of the State of Georgia, without regard to any
          statute or case law on choice of laws. Venue for any legal action
          brought under this Agreement shall be brought exclusively in the
          United States District Court for the Middle District of Georgia.
        </p>
        <p className="mt-6 font-semibold">
          WITNESS WHEREOF, each of the parties has caused this Agreement to be
          executed in its name and on its behalf:
        </p>

        {/* Signature Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
          {/* Left Column: Covered Entity (Provider - READ ONLY) */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base">Covered Entity:</h3>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Organization/Clinic Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={coveredEntity}
                className="bg-gray-50 border-gray-300 text-gray-900 font-medium"
                readOnly
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Name (Printed) <span className="text-red-500">*</span>
              </label>
              <Input
                value={coveredEntityName}
                className="bg-gray-50 border-gray-300 text-gray-900 font-medium"
                readOnly
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Signature <span className="text-red-500">*</span>
              </label>
              {coveredEntitySignatureUrl ? (
                <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coveredEntitySignatureUrl}
                    alt="Covered Entity Signature"
                    className="max-w-full h-auto"
                  />
                </div>
              ) : (
                <div className="border border-gray-300 rounded-md p-4 bg-gray-50 text-gray-700 font-medium text-sm">
                  No signature available
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={coveredEntityTitle}
                className="bg-gray-50 border-gray-300 text-gray-900 font-medium"
                readOnly
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                value={coveredEntityDate}
                className="bg-gray-50 border-gray-300 text-gray-900 font-medium"
                readOnly
              />
            </div>
          </div>

          {/* Right Column: Derma Route (Business Associate - EDITABLE or READ ONLY) */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base">
              Derma Route:
            </h3>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                By
              </label>
              <Input
                value={businessAssociateName}
                onChange={(e) =>
                  !isViewMode && onBusinessAssociateNameChange(e.target.value)
                }
                className={
                  isViewMode
                    ? "bg-gray-50 border-gray-300 text-gray-900 font-medium"
                    : "bg-white border-blue-300"
                }
                placeholder="Your name"
                readOnly={isViewMode}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Signature
              </label>
              {isViewMode ? (
                businessAssociateSignatureUrl ? (
                  <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={businessAssociateSignatureUrl}
                      alt="Business Associate Signature"
                      className="max-w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-md p-4 bg-gray-50 text-gray-500 text-sm">
                    No signature available
                  </div>
                )
              ) : (
                <>
                  <div className="text-xs text-gray-600 mb-2">
                    On a computer: Click, hold and drag your mouse in the
                    signature field.
                    <br />
                    On a phone/tablet: Touch and drag your finger in the
                    signature field.
                  </div>
                  <div
                    ref={canvasContainerRef}
                    className="w-full border border-blue-300 rounded-md overflow-hidden bg-white"
                  >
                    <SignatureCanvas
                      ref={businessAssociateSigPad}
                      penColor="black"
                      canvasProps={{
                        width: canvasWidth,
                        height: 120,
                        className: "outline-none bg-transparent max-w-full",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onClearSignature}
                    className="text-blue-600 text-xs underline mt-2"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Title
              </label>
              {isViewMode ? (
                <Input
                  value={businessAssociateTitle}
                  className="bg-gray-50 border-gray-300 text-gray-900 font-medium"
                  readOnly
                />
              ) : (
                <NativeSelect
                  value={businessAssociateTitle}
                  onChange={(e) =>
                    onBusinessAssociateTitleChange(e.target.value)
                  }
                  className="w-full bg-blue-50 border-blue-300 rounded-md p-2"
                >
                  <NativeSelectOption value="">Select title</NativeSelectOption>
                  <NativeSelectOption value="Mr">Mr</NativeSelectOption>
                  <NativeSelectOption value="Ms">Ms</NativeSelectOption>
                  <NativeSelectOption value="I prefer not to say">
                    I prefer not to say
                  </NativeSelectOption>
                </NativeSelect>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                value={businessAssociateDate}
                className={
                  isViewMode
                    ? "bg-gray-50 border-gray-300 text-gray-900 font-medium"
                    : "bg-gray-50 border-gray-300 text-gray-700"
                }
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Action Buttons - only show in edit mode */}
        {!isViewMode && (
          <div className="flex justify-center gap-4 pt-6 border-t mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className="min-w-[120px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="min-w-[120px]"
            >
              {saving ? "Saving..." : "Save & Approve"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
