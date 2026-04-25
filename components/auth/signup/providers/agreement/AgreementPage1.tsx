import React from "react";
import { Input } from "@/components/ui/input";
import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";

interface AgreementPage1Props {
  coveredEntityValue: string;
  onCoveredEntityChange: (value: string) => void;
}

export default function AgreementPage1({
  coveredEntityValue,
  onCoveredEntityChange,
}: AgreementPage1Props) {
  return (
    <div className="mb-8 min-h-[80vh]">
      <div className="space-y-4 text-sm text-black leading-relaxed">
        <p>
          This Business Associate Agreement (the &quot;Agreement&quot;), is
          hereby made by and between{" "}
          <Input
            value={coveredEntityValue}
            onChange={(e) => onCoveredEntityChange(e.target.value)}
            className="inline-block w-64 h-7 px-2 bg-blue-50 border-blue-300 align-baseline"
            placeholder="Enter Covered Entity"
          />{" "}
          (&quot;Covered Entity&quot;) and Integrity Tissue Solutions
          (&quot;Business Associate&quot;), each individually a
          &quot;Party&quot; and together the &quot;Parties.&quot;
        </p>
        <p>
          <strong>A.</strong> The purpose of this Agreement is to comply with
          the business associate requirements of the Standards for Privacy of
          Individually Identifiable Health Information (&quot;Privacy
          Regulations,&quot; 45 CFR Part 160, 162, and 164, Subparts A and E),
          the Standards for Security of Electronic Protected Health Information
          (&quot;Security Regulations&quot;, 45 CFR Parts 160, 162, and 164,
          Subpart C) (collectively referred to as &quot;HIPAA
          Regulations&quot;), contained in the Health Insurance Portability and
          Accountability Act of 1996 (&quot;HIPAA&quot;) (45 C.F.R. parts 160
          and 164), as amended by the Health Information Technology for Economic
          and Clinical Health Act (&quot;HITECH&quot;).
        </p>
        <p>
          <strong>B.</strong> Covered Entity and Business Associate have entered
          into this Agreement because Business Associate may receive and/or
          create certain Protected Health Information (&quot;PHI&quot;), as that
          term is defined or certain services (the &quot;Services&quot;) for
          Covered Entity, such as consultation, eligibility determination, or
          other activities related to the medical devices, supplies,
          therapeutics, and other products covered by Business Associate. For
          clarity, the Services do not include conducting insurance checks,
          precertifications, appeals, grievances, or any insurance-related
          activities on behalf of Covered Entity or patients.
        </p>
        <p>
          <strong>C.</strong> The Privacy Regulations require Covered Entity to
          obtain written assurances from Business Associate that Business
          Associate will appropriately safeguard the PHI.
        </p>
        <p className="mt-6">
          Now, therefore, in consideration of the mutual promises set forth
          below and other good and valuable consideration, the sufficiency and
          receipt of which is hereby acknowledged, the Parties agree as follows:
        </p>
      </div>
    </div>
  );
}
