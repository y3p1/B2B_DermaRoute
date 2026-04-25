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
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/auth";

export const clinicalInfoSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  placeOfService: z.string().min(1, "Place of Service is required"),
  insurance: z.string().min(1, "Insurance is required"),
  // commercial flag derived from the selected insurance; carried through formData for Step 3 filtering
  insuranceCommercial: z.boolean().optional(),
  woundType: z.string().min(1, "Wound Type is required"),
  woundSize: z.string().min(1, "Wound Size is required"),
  woundLocation: z.string().optional(),
  icd10: z.string().optional(),
  conservativeTherapy: z.enum(["yes", "no"]),
  diabetic: z.enum(["yes", "no"]),
  a1cPercent: z.number().min(0).max(25).optional(),
  a1cMeasuredAt: z.string().optional(),
  tunneling: z.enum(["yes", "no"]),
  infected: z.enum(["yes", "no"]),
});

export type ClinicalInfoForm = z.infer<typeof clinicalInfoSchema>;

interface Step1ClinicalInfoProps {
  onNext: (data: ClinicalInfoForm) => void;
  onClose: () => void;
  defaultValues?: Partial<ClinicalInfoForm>;
}

export function Step1ClinicalInfo({
  onNext,
  onClose,
  defaultValues,
}: Step1ClinicalInfoProps) {
  const token = useAuthStore((s) => s.jwt);
  const role = useAuthStore((s) => s.role);
  const currentProvider = useAuthStore((s) => s.provider);

  const form = useForm<ClinicalInfoForm>({
    resolver: zodResolver(clinicalInfoSchema),
    defaultValues: defaultValues || {},
  });

  // Reset form when defaultValues change (for edit mode)
  React.useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  React.useEffect(() => {
    if (role !== "provider" || !currentProvider?.id) return;

    if (form.getValues("provider") !== currentProvider.id) {
      form.setValue("provider", currentProvider.id, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [currentProvider?.id, form, role]);

  const [providers, setProviders] = useState<
    Array<{ id: string; clinicName: string }>
  >([]);
  const [insurancesList, setInsurancesList] = useState<
    Array<{ id: string; name: string; commercial: boolean }>
  >([]);
  const [woundSizesList, setWoundSizesList] = useState<
    Array<{ key: string; label: string; category?: string }>
  >([]);
  // ICD-10 will be entered as a single comma-separated text field

  // load providers on mount
  useEffect(() => {
    if (role === "provider") return;
    if (!token) return;
    void (async () => {
      try {
        const res = await fetch("/api/providers", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const body = await res.json();
        if (body && Array.isArray(body.data)) {
          const mapped = body.data.map((r: unknown) => {
            const it = r as { id?: string; clinicName?: string };
            return {
              id: it.id || "",
              clinicName: it.clinicName || "",
            };
          });
          setProviders(mapped);
        }
      } catch (error) {
        console.error("Failed to load providers:", error);
      }
    })();
  }, [role, token]);

  // load insurances from DB on mount
  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const res = await fetch("/api/insurances", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (body && Array.isArray(body.data)) {
          setInsurancesList(
            body.data.map((r: unknown) => {
              const it = r as {
                id?: string;
                name?: string;
                commercial?: boolean;
              };
              return {
                id: it.id ?? "",
                name: it.name ?? "",
                commercial: it.commercial ?? false,
              };
            }),
          );
        }
      } catch (error) {
        console.error("Failed to load insurances:", error);
      }
    })();
  }, [token]);

  // load wound sizes on mount
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/bv/wound-sizes");
        const body = await res.json();
        if (body && Array.isArray(body.data)) {
          const mapped = Array.isArray(body.data)
            ? body.data.map((r: unknown) => {
                const it = r as { key?: string; label?: string; category?: string };
                return { key: it.key, label: it.label, category: it.category } as {
                  key: string;
                  label: string;
                  category?: string;
                };
              })
            : [];
          // Deduplicate by `key` to avoid duplicate React keys causing warnings
          const seen = new Set<string>();
          const unique: Array<{ key: string; label: string }> = [];
          for (const w of mapped) {
            if (!w || !w.key) continue;
            if (seen.has(w.key)) continue;
            seen.add(w.key);
            unique.push(w);
          }
          setWoundSizesList(unique);
        }
      } catch {
        // fallback to nothing
      }
    })();
  }, []);

  function onSubmit(values: ClinicalInfoForm) {
    // Attach the commercial flag from the selected insurance so Step 3 can filter products
    const selectedInsurance = insurancesList.find(
      (i) => i.name === values.insurance,
    );
    const withIcd: ClinicalInfoForm = {
      ...values,
      icd10: values.icd10 ? String(values.icd10).trim() : undefined,
      insuranceCommercial: selectedInsurance?.commercial,
    };
    onNext(withIcd);
  }

  return (
    <div className="p-8">
      <button className="mb-4 text-sm text-gray-600" onClick={onClose}>
        &larr; Back
      </button>
      <div className="mb-4 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-black" style={{ width: "33%" }} />
      </div>
      <h2 className="text-2xl font-bold mb-4">Clinical Info</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
        <div className="font-bold">Practice:</div>
        <div>
          <span className="font-bold">Rep:</span> Integrity Tissue Solutions -
          Will
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="insurance"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[60vh] overflow-auto">
                        {insurancesList.map((ins) => (
                          <SelectItem key={ins.id} value={ins.name}>
                            {ins.name}
                            <span className="ml-2 text-xs text-muted-foreground">
                              (
                              {ins.commercial ? "Commercial" : "Non-Commercial"}
                              )
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="provider"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordering Provider *</FormLabel>
                  <FormControl>
                    {role === "provider" && currentProvider ? (
                      <div className="space-y-2">
                        <Input
                          value={currentProvider.clinicName ?? ""}
                          readOnly
                          aria-readonly="true"
                          className="bg-slate-50 text-slate-700"
                        />
                        <input
                          type="hidden"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </div>
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select provider..." />
                        </SelectTrigger>
                        <SelectContent>
                          {providers.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.clinicName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4">
              <FormField
                name="placeOfService"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Place of Service *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="hospital">Hospital</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <FormField
              name="woundType"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wound Type *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diabetic foot ulcer">Diabetic foot ulcer</SelectItem>
                        <SelectItem value="Venous leg ulcer">Venous leg ulcer</SelectItem>
                        <SelectItem value="Pressure ulcer">Pressure ulcer</SelectItem>
                        <SelectItem value="MOHS (acute)">MOHS (acute)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="woundSize"
              control={form.control}
              render={({ field }) => {
                const discSizes = woundSizesList.filter((w) => w.category === "disc");
                const rectSizes = woundSizesList.filter((w) => w.category !== "disc");
                return (
                  <FormItem>
                    <FormLabel>Wound Size *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select wound size..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[60vh] overflow-auto">
                          {discSizes.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>Discs (Round)</SelectLabel>
                              {discSizes.map((w) => (
                                <SelectItem key={w.key} value={w.key}>
                                  {w.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                          {rectSizes.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>Square &amp; Rectangular</SelectLabel>
                              {rectSizes.map((w) => (
                                <SelectItem key={w.key} value={w.key}>
                                  {w.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="woundLocation"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wound Location</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="e.g., Left foot plantar" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="icd10"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ICD-10 Codes</FormLabel>
                  <div className="mb-2 text-sm text-muted-foreground">
                    Add one or more ICD-10 codes (e.g., E10, F20, I18). They
                    will be sent as a comma-separated list.
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Type ICD-10 codes separated by commas (e.g., E10, F20)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="conservativeTherapy"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>4+ weeks conservative therapy? *</FormLabel>
                  <FormControl>
                    <div className="flex gap-4">
                      <label>
                        <input
                          type="radio"
                          value="yes"
                          checked={field.value === "yes"}
                          onChange={() => field.onChange("yes")}
                        />{" "}
                        Yes
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="no"
                          checked={field.value === "no"}
                          onChange={() => field.onChange("no")}
                        />{" "}
                        No
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="diabetic"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient diabetic? *</FormLabel>
                  <FormControl>
                    <div className="flex gap-4">
                      <label>
                        <input
                          type="radio"
                          value="yes"
                          checked={field.value === "yes"}
                          onChange={() => field.onChange("yes")}
                        />{" "}
                        Yes
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="no"
                          checked={field.value === "no"}
                          onChange={() => field.onChange("no")}
                        />{" "}
                        No
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {form.watch("diabetic") === "yes" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="a1cPercent"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Most recent A1C (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="25"
                        placeholder="e.g., 7.2"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === "" ? undefined : Number(v));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="a1cMeasuredAt"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>A1C measured on</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="tunneling"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tunneling/undermining? *</FormLabel>
                  <FormControl>
                    <div className="flex gap-4">
                      <label>
                        <input
                          type="radio"
                          value="yes"
                          checked={field.value === "yes"}
                          onChange={() => field.onChange("yes")}
                        />{" "}
                        Yes
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="no"
                          checked={field.value === "no"}
                          onChange={() => field.onChange("no")}
                        />{" "}
                        No
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="infected"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currently infected? *</FormLabel>
                  <FormControl>
                    <div className="flex gap-4">
                      <label>
                        <input
                          type="radio"
                          value="yes"
                          checked={field.value === "yes"}
                          onChange={() => field.onChange("yes")}
                        />{" "}
                        Yes
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="no"
                          checked={field.value === "no"}
                          onChange={() => field.onChange("no")}
                        />{" "}
                        No
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gray-700 hover:bg-gray-800 text-white mt-4"
          >
            Continue
          </Button>
        </form>
      </Form>
    </div>
  );
}
