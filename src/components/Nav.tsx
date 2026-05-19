import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown } from "lucide-react";

export default function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>
        <span
          style={{ fontFamily: "'Libre Baskerville', serif" }}
          className="cursor-pointer text-xl text-green-700 p-2 inline-flex items-center bg-gray-100 rounded-md"
        >
          <b>ains</b>.art
          <ChevronsUpDown className="h-4 w-4 text-gray-700" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-gray-100 touch-auto">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <a href="/">Karte</a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <a href="/konzept">Konzept</a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <a href="/impressum">Impressum</a>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <a href="/datenschutz">Datenschutz</a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
