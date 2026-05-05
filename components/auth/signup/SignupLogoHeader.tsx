import BrandLogo from "../../BrandLogo";

export default function SignupLogoHeader() {
  return (
    <div className="flex flex-col items-center mb-8 mt-0">
      <div className="w-64 h-24 relative flex items-center justify-center">
        <BrandLogo width={220} height={55} />
      </div>
    </div>
  );
}
