import { Suspense } from "react";
import BaaProviderEditClient from "@/components/admin/baa-providers/BaaProviderEditClient";

export default async function AdminBaaProviderEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense>
      <BaaProviderEditClient id={id} />
    </Suspense>
  );
}
