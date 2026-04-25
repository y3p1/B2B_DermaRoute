import AdminUserCreateClient from "@/components/admin/users/AdminUserCreateClient";

export default function ClinicStaffUserCreatePage() {
  return (
    <AdminUserCreateClient
      allowedRoles={["clinic_staff"]}
      backHref="/clinic-staff"
      backLabel="Back to dashboard"
    />
  );
}
