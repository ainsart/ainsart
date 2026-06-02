import "../styles/global.css";
import { Badge } from "@/components/ui/badge";

export default function Ainsart({ center = true }) {
  return (
    <Badge
      className={`absolute top-4 ${center ? "left-1/2 -translate-x-1/2" : "left-4"} z-10 transition-colors hover:border-gray-200 border border-green-500 bg-gray-100 text-card-foreground shadow-sm hover:border-green-400 select-none`}
    >
      <a
        href="/"
        className="cursor-pointer text-xl text-green-700 p-1 inline-flex items-center bg-transparent rounded-md font-['Libre_Baskerville',_serif]"
      >
        <b>ains</b>.art
      </a>
    </Badge>
  );
}
