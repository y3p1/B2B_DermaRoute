import AdminUserCreateClient from "@/components/admin/users/AdminUserCreateClient";

export default function AdminUserCreatePage() {
  return (
    <AdminUserCreateClient
      allowedRoles={["admin"]}
      backHref="/clinic-staff"
      backLabel="Back to dashboard"
    />
  );
}
