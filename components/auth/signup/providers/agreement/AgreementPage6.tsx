import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { pdf } from "@react-pdf/renderer";
import AgreementPDF from "./AgreementPDF";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import SignatureCanvas from "react-signature-canvas";
import type { UseFormReturn, SubmitHandler } from "react-hook-form";
import type { SignatureData } from "../SignupStep3Agreement";

interface AgreementPage6Props {
  coveredEntityValue: string;
  onCoveredEntityChange: (value: string) => void;
  form: UseFormReturn<SignatureData>;
  coveredEntitySigPad: React.RefObject<SignatureCanvas | null>;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  canvasWidth: number;
  onBack: () => void;
  onSubmit: SubmitHandler<SignatureData>;
}

export default function AgreementPage6(props: AgreementPage6Props) {
  const {
    coveredEntityValue,
    onCoveredEntityChange,
    form,
    coveredEntitySigPad,
    canvasContainerRef,
    canvasWidth,
    onBack,
    onSubmit,
  } = props;

  useEffect(() => {
    form.setValue(
      "coveredEntityDate",
      new Date().toLocaleDateString("en-US", { timeZone: "America/New_York" })
    );
  }, [form]);

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
          Integrity Tissue Solutions, Attn: Privacy Officer
          <br />
          10 Hwy 98 STE 315 PMB#38 Bonaire, GA 31005
        </p>
        <p className="ml-6">
          <strong>to Covered Entity:</strong>
          <br />
          <Input
            value={coveredEntityValue}
            onChange={(e) => onCoveredEntityChange(e.target.value)}
            className="w-full max-w-md bg-blue-50 border-blue-300 mt-1"
            placeholder="Enter Covered Entity address"
          />
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
        {/* Signature Section - shadcn Form */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) =>
              onSubmit({ ...data, agreementStatus: "Signed" })
            )}
            className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex flex-col md:grid md:grid-cols-2 gap-8">
              <div className="space-y-4 mb-8 md:mb-0 p-2 md:p-0 rounded-md">
                <p className="font-semibold mb-4">Covered Entity:</p>
                <FormField
                  control={form.control}
                  name="coveredEntity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Organization/Clinic Name{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="w-full bg-blue-50 border-blue-300"
                          placeholder="Enter covered entity name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coveredEntityName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Name (Printed) <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="w-full bg-blue-50 border-blue-300"
                          placeholder="Enter name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coveredEntitySignature"
                  render={() => (
                    <FormItem>
                      <FormLabel>
                        Signature <span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="text-xs text-gray-500 mb-1">
                        On a computer: Click, hold and drag your mouse in the
                        signature field.
                        <br />
                        On a phone/tablet: Touch and drag your finger in the
                        signature field.
                      </div>
                      <FormControl>
                        <div className="w-full">
                          <div
                            ref={canvasContainerRef}
                            className="w-full h-25 bg-blue-50 border border-blue-300 rounded-md flex items-center justify-center mb-2 overflow-hidden"
                          >
                            <SignatureCanvas
                              ref={coveredEntitySigPad}
                              penColor="black"
                              canvasProps={{
                                width: canvasWidth,
                                height: 96,
                                className:
                                  "outline-none bg-transparent max-w-full",
                              }}
                              onEnd={() => {
                                const dataUrl =
                                  coveredEntitySigPad.current
                                    ?.getTrimmedCanvas()
                                    .toDataURL("image/png") || "";
                                form.setValue(
                                  "coveredEntitySignature",
                                  dataUrl,
                                  { shouldValidate: true }
                                );
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            className="text-xs text-blue-600 underline mb-2"
                            onClick={() => {
                              coveredEntitySigPad.current?.clear();
                              form.setValue("coveredEntitySignature", "", {
                                shouldValidate: true,
                              });
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coveredEntityTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Title <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <NativeSelect
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full bg-blue-50 border-blue-300 rounded-md p-2"
                        >
                          <NativeSelectOption value="">
                            Select title
                          </NativeSelectOption>
                          <NativeSelectOption value="Mr">Mr</NativeSelectOption>
                          <NativeSelectOption value="Ms">Ms</NativeSelectOption>
                          <NativeSelectOption value="I prefer not to say">
                            I prefer not to say
                          </NativeSelectOption>
                        </NativeSelect>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coveredEntityDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Date <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          readOnly
                          className="w-full bg-blue-50 border-blue-300"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-4 p-2 md:p-0 rounded-md">
                <p className="font-semibold mb-4">
                  Integrity Tissue Solutions:
                </p>
                <FormField
                  control={form.control}
                  name="businessAssociateName"
                  render={() => (
                    <FormItem>
                      <FormLabel>By</FormLabel>
                      <FormControl>
                        <Input
                          readOnly
                          value=""
                          className="w-full bg-blue-50 border-blue-300"
                        />
                      </FormControl>
                      {/* SignatureCanvas below the By field, styled like covered entity, but readOnly */}
                      <div className="my-2">
                        <span className="block text-md text-black mb-1">
                          Signature
                        </span>
                        <div
                          className="border border-blue-300 rounded bg-blue-50 flex items-center justify-center"
                          style={{
                            width: "100%",
                            minHeight: "100px",
                            padding: 0,
                          }}
                        >
                          <div style={{ position: "relative", width: "100%" }}>
                            <SignatureCanvas
                              penColor="black"
                              canvasProps={{
                                width: canvasWidth,
                                height: 96,
                                className:
                                  "outline-none bg-transparent max-w-full",
                              }}
                              // Optionally, set default signature if you want to show a pre-filled signature
                              // ref={businessAssociateSigPad} // If you want to control it later
                            />
                            {/* Overlay to disable drawing (simulate readOnly) */}
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                cursor: "not-allowed",
                                zIndex: 10,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessAssociateTitle"
                  render={() => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          readOnly
                          value=""
                          className="w-full bg-blue-50 border-blue-300"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessAssociateDate"
                  render={() => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          readOnly
                          value={new Date().toLocaleDateString("en-US", {
                            timeZone: "America/New_York",
                          })}
                          className="w-full bg-blue-50 border-blue-300"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-4 col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center text-blue-900 text-base font-medium shadow-sm">
                  <svg
                    className="mx-auto mb-2"
                    width="32"
                    height="32"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                    />
                  </svg>
                  <span>
                    <strong>Note:</strong> Once you click{" "}
                    <span className="text-blue-700">Agree and Continue</span>{" "}
                    and reach the Success Page, your Business Associate
                    Agreement will be sent for admin review and signature.
                    We&apos;ll notify you as soon as the process is complete.
                  </span>
                </div>
              </div>
              <div className="mt-6 flex gap-4 col-span-2">
                <Button
                  type="button"
                  onClick={onBack}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-base py-3 rounded-lg"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className={`flex-1 text-base py-3 rounded-lg ${
                    form.formState.isValid
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 text-gray-800"
                  }`}
                  disabled={!form.formState.isValid}
                >
                  Agree and Continue
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
