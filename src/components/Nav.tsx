import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Nav() {
  return (
    <nav className="items-center h-full">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <span
            className="cursor-pointer text-2xl text-green-700 pt-2 inline-flex items-center gap-1"
            style={{ fontFamily: "'Libre Baskerville', serif" }}
          >
            <b>ains</b>.art
            <ChevronsUpDown className="h-4 w-4 text-gray-700" />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-card">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <a href="/">Karte</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
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
      <a href="/impressum">Impressum</a>
    </nav>
  );
}
