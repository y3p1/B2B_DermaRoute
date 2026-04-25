import Image from "next/image";
import ITSLogo from "../assets/images/ITS-logo.jpg";

export default function IntegrityTissueLogo({
  width = 384,
  height = 240,
  className = "",
}) {
  return (
    <div
      className={`relative flex items-center ${className}`}
      style={{ width, height }}
    >
      <Image
        src={ITSLogo}
        alt="Integrity Tissue Solutions Logo"
        width={width}
        height={height}
        className="object-contain"
        style={{ width: "fit-content", height: "100%" }}
        priority
      />
    </div>
  );
}
