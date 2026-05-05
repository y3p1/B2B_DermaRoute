import { Suspense } from "react";
import BaaProviderViewClient from "@/components/admin/baa-providers/BaaProviderViewClient";

export default async function AdminBaaProviderViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense>
      <BaaProviderViewClient id={id} />
    </Suspense>
  );
}
