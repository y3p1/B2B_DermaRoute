import Image from "next/image";
import DermaRouteLogo from "../assets/images/dermaroute-logo.svg";

export default function BrandLogo({
  width = 200,
  height = 50,
  className = "",
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center ${className}`}
      style={{ width, height }}
    >
      <Image
        src={DermaRouteLogo}
        alt="DermaRoute Demo"
        width={width}
        height={height}
        className="object-contain"
        style={{ width: "fit-content", height: "100%" }}
        priority
      />
    </div>
  );
}
