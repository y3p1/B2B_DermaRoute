import BaaProviderViewClient from "@/components/admin/baa-providers/BaaProviderViewClient";

export default async function AdminBaaProviderViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BaaProviderViewClient id={id} />;
}
