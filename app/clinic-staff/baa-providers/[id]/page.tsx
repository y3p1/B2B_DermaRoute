import BaaProviderViewClient from "@/components/admin/baa-providers/BaaProviderViewClient";

export default async function ClinicStaffBaaProviderViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <BaaProviderViewClient
      id={id}
      basePath="/clinic-staff/baa-providers"
      dashboardHref="/clinic-staff?tab=baa_agreements"
      listHref="/clinic-staff?tab=baa_agreements"
    />
  );
}
