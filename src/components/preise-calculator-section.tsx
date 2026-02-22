"use client";

import { useState } from "react";
import { PriceCalculator, type PricingData } from "@/app/(marketing)/preise/price-calculator";
import { RoomCalculator } from "@/components/room-calculator";
import { Reveal } from "@/components/motion/reveal";

interface Props {
  pricing: PricingData | null;
}

export function PreiseCalculatorSection({ pricing }: Props) {
  const [roomVolume, setRoomVolume] = useState<number | undefined>(undefined);

  return (
    <>
      <div id="price-calculator" className="scroll-mt-24">
        <Reveal className="mt-10">
          <PriceCalculator pricing={pricing} externalVolumeM3={roomVolume} />
        </Reveal>
      </div>

      <Reveal className="mt-6">
        <RoomCalculator onVolumeChange={setRoomVolume} />
      </Reveal>
    </>
  );
}
