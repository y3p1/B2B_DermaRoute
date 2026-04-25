"use client";
import React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogOut, Menu, Settings, User, Save, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import IntegrityTissueLogo from "../IntegrityTissueLogo";
import { useAuthStore } from "@/store/auth";
import { apiPatch } from "@/lib/apiClient";

interface DashboardNavbarProps {
  onMenuToggle?: () => void;
}

type ProviderFormData = {
  accountPhone: string;
  email: string;
  npiNumber: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  providerSpecialty: string;
  taxId: string;
  groupNpi: string;
};

const fieldLabels: Record<keyof ProviderFormData, string> = {
  accountPhone: "Account Phone Number",
  email: "Email Address",
  npiNumber: "NPI Number",
  clinicName: "Clinic / Practice Name",
  clinicAddress: "Clinic Address",
  clinicPhone: "Clinic Phone Number",
  providerSpecialty: "Physician Specialty",
  taxId: "Tax ID (EIN)",
  groupNpi: "Group NPI",
};

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ onMenuToggle }) => {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const provider = useAuthStore((s) => s.provider);
  const accountType = useAuthStore((s) => s.accountType);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  const [form, setForm] = React.useState<ProviderFormData>({
    accountPhone: "",
    email: "",
    npiNumber: "",
    clinicName: "",
    clinicAddress: "",
    clinicPhone: "",
    providerSpecialty: "",
    taxId: "",
    groupNpi: "",
  });

  // Populate form with provider data when dialog opens
  React.useEffect(() => {
    if (isProfileOpen && provider) {
      setForm({
        accountPhone: provider.accountPhone || "",
        email: provider.email || "",
        npiNumber: provider.npiNumber || "",
        clinicName: provider.clinicName || "",
        clinicAddress: provider.clinicAddress || "",
        clinicPhone: provider.clinicPhone || "",
        providerSpecialty: provider.providerSpecialty || "",
        taxId: provider.taxId || "",
        groupNpi: provider.groupNpi || "",
      });
      setIsEditing(false);
      setSaveMessage(null);
    }
  }, [isProfileOpen, provider]);

  const handleChange = (field: keyof ProviderFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const token = useAuthStore((s) => s.jwt);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await apiPatch("/api/me/provider", form, { token: token || undefined });
      // Refresh the auth store to get the updated provider data
      await hydrate();
      setSaveMessage({ type: "success", text: "Profile updated successfully!" });
      setIsEditing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save changes";
      setSaveMessage({ type: "error", text: message });
    } finally {
      setSaving(false);
    }
  };

  const isProvider = accountType === "provider" && provider;

  return (
    <>
    <nav className="w-full bg-[#18192B] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2">
        {onMenuToggle && (
          <Button
            variant="ghost"
            className="text-white hover:bg-[#232345] p-2 lg:hidden"
            size="icon"
            aria-label="Toggle menu"
            onClick={onMenuToggle}
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <IntegrityTissueLogo width={200} height={80} />
      </div>
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="text-white hover:bg-[#232345] p-2 flex items-center gap-2"
              aria-label="User Menu"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2a2a4f]">
                <Settings className="w-4 h-4 text-gray-300" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setIsProfileOpen(true)}
            >
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Legal & Compliance</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/legal/terms-of-service" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500 hover:text-red-600 focus:text-red-600 cursor-pointer"
              onClick={async () => {
                await logout();
                router.replace("/auth");
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>

    <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>

        {/* Role & Account Type Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {user?.email || "N/A"}
            </div>
            <div className="text-xs text-slate-500 capitalize">
              {role || "N/A"}
            </div>
          </div>
        </div>

        {isProvider ? (
          <div className="space-y-4 py-2">
            {/* Provider Profile Fields */}
            {(Object.keys(fieldLabels) as Array<keyof ProviderFormData>).map((field) => (
              <div key={field} className="grid grid-cols-3 items-start gap-3">
                <label
                  htmlFor={`profile-${field}`}
                  className="text-sm font-medium text-slate-500 pt-2"
                >
                  {fieldLabels[field]}
                </label>
                <div className="col-span-2">
                  {isEditing ? (
                    <input
                      id={`profile-${field}`}
                      type={field === "email" ? "email" : "text"}
                      value={form[field]}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  ) : (
                    <span className="text-sm text-slate-800 font-medium block py-2">
                      {form[field] || "—"}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Save Message */}
            {saveMessage && (
              <div
                className={`text-sm px-3 py-2 rounded-lg ${
                  saveMessage.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {saveMessage.text}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      // Reset form to current provider data
                      if (provider) {
                        setForm({
                          accountPhone: provider.accountPhone || "",
                          email: provider.email || "",
                          npiNumber: provider.npiNumber || "",
                          clinicName: provider.clinicName || "",
                          clinicAddress: provider.clinicAddress || "",
                          clinicPhone: provider.clinicPhone || "",
                          providerSpecialty: provider.providerSpecialty || "",
                          taxId: provider.taxId || "",
                          groupNpi: provider.groupNpi || "",
                        });
                      }
                      setSaveMessage(null);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Admin / Clinic Staff — show basic info */
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-sm font-medium text-gray-500">Email</span>
              <span className="col-span-2 text-sm text-gray-900 font-semibold">{user?.email || "N/A"}</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-sm font-medium text-gray-500">Role</span>
              <span className="col-span-2 text-sm text-gray-900 font-semibold capitalize">{role || "N/A"}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default DashboardNavbar;
