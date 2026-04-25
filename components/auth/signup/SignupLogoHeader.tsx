import Image from "next/image";
import ITSLogo from "../../../../assets/images/ITS-logo.jpg";

export default function SignupLogoHeader() {
  return (
    <div className="flex flex-col items-center mb-8 mt-0">
      <div className="w-64 h-40 relative">
        <Image
          src={ITSLogo}
          alt="Integrity Tissue Solutions Logo"
          width={384}
          height={240}
          className="object-contain rounded-lg"
          priority
        />
      </div>
    </div>
  );
}
