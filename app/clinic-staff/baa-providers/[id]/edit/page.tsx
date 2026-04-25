import BaaProviderEditClient from "@/components/admin/baa-providers/BaaProviderEditClient";

export default async function ClinicStaffBaaProviderEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <BaaProviderEditClient id={id} basePath="/clinic-staff/baa-providers" />
  );
}
