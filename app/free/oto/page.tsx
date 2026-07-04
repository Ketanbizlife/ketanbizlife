import type { Metadata } from "next";
import { OtoPage } from "@/components/OtoPage";
import { UtmTracker } from "@/components/UtmTracker";
import { clientConfig } from "@/client.config";

export const metadata: Metadata = {
  title: "Special Upgrade — Ketan BizLife Export Tools",
  description:
    "A one-time offer for registered exporters: add the done-for-you buyer qualification, negotiation, and payment-terms tools Ketan uses daily.",
  robots: { index: false, follow: false },
};

export default function OtoRoute() {
  return (
    <>
      <UtmTracker storageKey={clientConfig.funnel.sessionStorageKey} />
      <OtoPage config={clientConfig} />
    </>
  );
}
