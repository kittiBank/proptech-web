import {
  AirVent,
  Bath,
  Bus,
  Car,
  Cctv,
  CookingPot,
  Dumbbell,
  KeyRound,
  Laptop,
  PawPrint,
  PlugZap,
  Refrigerator,
  Shirt,
  ShieldCheck,
  ShowerHead,
  Trees,
  Tv,
  WashingMachine,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { amenityLabels } from "@/data/amenities";

const amenityIcons: Record<string, LucideIcon> = {
  aircon: AirVent,
  "water-heater": ShowerHead,
  wardrobe: Shirt,
  kitchen: CookingPot,
  washer: WashingMachine,
  fridge: Refrigerator,
  tv: Tv,
  wifi: Wifi,
  bathtub: Bath,
  garden: Trees,
  pool: Waves,
  gym: Dumbbell,
  security: ShieldCheck,
  cctv: Cctv,
  parking: Car,
  keycard: KeyRound,
  coworking: Laptop,
  ev: PlugZap,
  shuttle: Bus,
  park: Trees,
  pet: PawPrint,
};

export function AmenityList({ ids, label }: { ids: string[]; label: string }) {
  if (ids.length === 0) return null;
  return (
    <div>
      <h3 className="text-[15px] font-semibold text-ink">{label}</h3>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {ids.map((id) => {
          const Icon = amenityIcons[id] ?? ShieldCheck;
          return (
            <li key={id} className="flex items-center gap-3 text-[15px] text-ink">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-mist text-brand-strong">
                <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </span>
              {amenityLabels[id] ?? id}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
