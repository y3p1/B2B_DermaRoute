"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// If you have a shadcn Textarea component, import it. Otherwise, use Input for single-line and native textarea for multi-line.
import { Textarea } from "@/components/ui/textarea";

export const patientDeliverySchema = z.object({
  initials: z.string().min(1, "Patient initials required"),
  applicationDate: z.string().min(1, "Required"),
  deliveryDate: z.string().min(1, "Required"),
  instructions: z.string().optional(),
});

export type PatientDeliveryForm = z.infer<typeof patientDeliverySchema>;

interface Step2PatientDeliveryProps {
  onNext: (data: PatientDeliveryForm) => void;
  onBack: () => void;
  defaultValues?: Partial<PatientDeliveryForm>;
}

export function Step2PatientDelivery({
  onNext,
  onBack,
  defaultValues,
}: Step2PatientDeliveryProps) {
  const form = useForm<PatientDeliveryForm>({
    resolver: zodResolver(patientDeliverySchema),
    defaultValues: defaultValues || {},
  });

  // Reset form when defaultValues change (for edit mode).
  // Stringified compare avoids resetting when parent re-renders pass a new object identity.
  const defaultValuesKey = defaultValues ? JSON.stringify(defaultValues) : "";
  React.useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValuesKey]);

  function onSubmit(values: PatientDeliveryForm) {
    onNext(values);
  }

  return (
    <div className="p-8">
      <div className="flex justify-between mb-4">
        <button className="text-sm text-gray-600" onClick={onBack}>
          &larr; Back
        </button>
        <span className="text-sm text-gray-600">Step 2 of 3</span>
      </div>
      <div className="mb-4 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600" style={{ width: "66%" }} />
      </div>
      <h2 className="text-2xl font-bold mb-4">Patient & Delivery Info</h2>
      <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-6 text-red-800 font-semibold">
        HIPAA NOTICE: Use INITIALS ONLY. No PHI accepted.
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            name="initials"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient Initials ONLY</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              name="applicationDate"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposed application date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="deliveryDate"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred delivery date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            name="instructions"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special delivery instructions (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onBack}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Get Product Recommendation
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
