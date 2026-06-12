import { MarkerPopup } from "@/components/ui/map";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type MarkerPopupCardProps = {
  href: string;
  name: string;
  description: string;
};

function MarkerPopupCard({ href, name, description }: MarkerPopupCardProps) {
  return (
    <MarkerPopup className="p-0 bg-transparent w-[240px] border-none m-1 shadow-none">
      <a href={href} className="group block no-underline">
        <Card className="cursor-pointer py-4">
          <CardHeader className="px-4">
            <CardTitle>{name}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </CardHeader>
        </Card>
      </a>
    </MarkerPopup>
  );
}

export { MarkerPopupCard };
