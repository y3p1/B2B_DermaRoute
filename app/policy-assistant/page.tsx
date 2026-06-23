import { Suspense } from "react";
import PolicyAssistantClient from "@/components/policy-assistant/PolicyAssistantClient";

export const metadata = { title: "Policy Assistant | DermaRoute" };

export default function PolicyAssistantPage() {
  return (
    <Suspense>
      <PolicyAssistantClient />
    </Suspense>
  );
}
