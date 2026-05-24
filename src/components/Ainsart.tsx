import "../styles/global.css";
import { Badge } from "@/components/ui/badge";

export default function Ainsart() {
  return (
    <Badge className="fixed top-4 left-1/2 -translate-x-1/2 z-10 transition-colors hover:border-gray-200 border border-green-500 bg-gray-100 text-card-foreground shadow-sm hover:border-green-400">
      <a
        href="/"
        style={{ fontFamily: "'Libre Baskerville', serif" }}
        className="cursor-pointer text-xl text-green-700 p-1 inline-flex items-center bg-transparent rounded-md"
      >
        <b>ains</b>.art
      </a>
    </Badge>
  );
}
