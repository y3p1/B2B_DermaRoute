import BaaProviderViewPageClient from "@/components/dashboard/BaaProviderViewPageClient";

export default async function ProviderBaaProviderViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BaaProviderViewPageClient id={id} />;
}
