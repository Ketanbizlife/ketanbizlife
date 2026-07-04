import type { Metadata } from "next";
import { AboutSection } from "@/components/AboutSection";
import { AgendaSection } from "@/components/AgendaSection";
import { AntiPositioningSection } from "@/components/AntiPositioningSection";
import { BonusesSection } from "@/components/BonusesSection";
import { FaqSection } from "@/components/FaqSection";
import { FinalCtaSection } from "@/components/FinalCtaSection";
import { FloatingCountdown } from "@/components/FloatingCountdown";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { IdentityBadgesGrid } from "@/components/IdentityBadgesGrid";
import { RegisterModal } from "@/components/RegisterModal";
import { ScenesSection } from "@/components/ScenesSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { TransformationTable } from "@/components/TransformationTable";
import { UtmTracker } from "@/components/UtmTracker";
import { WhoSection } from "@/components/WhoSection";
import { clientConfig } from "@/client.config";

export const metadata: Metadata = {
  title:
    "For Indian Exporters Stuck in the Same Loop — Free Live Sunday Webinar",
  description: `Buyer ko price diya. Buyer gayab ho gaya. Phir se. 8/10 Indian exporters fail — not because of documents, but because nobody taught them how to find real buyers. Free live webinar · ${clientConfig.event.dateLabel}, ${clientConfig.event.timeLabel}.`,
};

export default function FunnelPage() {
  // Hide stats based on approval toggles (₹100+ Cr volume, 9+ Countries)
  const hiddenStatIndices: number[] = [];
  if (!clientConfig.approvalItems.showHundredCroreClaim) {
    // Stat index 2 in the new order = "100+ Cr Cumulative Export Volume"
    hiddenStatIndices.push(2);
  }
  if (!clientConfig.approvalItems.showNineCountriesStat) {
    // Stat index 3 in the new order = "9+ Countries"
    hiddenStatIndices.push(3);
  }

  // Approval Item 5 — hide the competitor anti-positioning line if toggle is off
  const antiPositioning = clientConfig.approvalItems
    .showCompetitorAntiPositioning
    ? clientConfig.antiPositioning
    : {
        ...clientConfig.antiPositioning,
        items: clientConfig.antiPositioning.items.filter(
          (item) => !item.includes("subscription"),
        ),
      };

  return (
    <>
      <UtmTracker storageKey={clientConfig.funnel.sessionStorageKey} />

      <Hero
        hero={clientConfig.hero}
        event={clientConfig.event}
        showRefundLine={clientConfig.approvalItems.showRefundLine}
      />

      <main>
        <ScenesSection scenes={clientConfig.scenes} />
        <TestimonialsSection testimonials={clientConfig.testimonials} />
        <WhoSection who={clientConfig.who} />
        <AgendaSection agenda={clientConfig.agenda} />
        <TransformationTable transformation={clientConfig.transformation} />
        <IdentityBadgesGrid identity={clientConfig.identityBadges} />
        <BonusesSection bonuses={clientConfig.bonuses} variant="light" />
        <AboutSection
          about={clientConfig.about}
          hiddenStatIndices={hiddenStatIndices}
        />
        <AntiPositioningSection anti={antiPositioning} />
        <FaqSection faq={clientConfig.faq} />
        <FinalCtaSection finalCta={clientConfig.finalCta} />
      </main>

      <Footer
        brand={clientConfig.brand}
        footer={clientConfig.footer}
        social={clientConfig.social}
      />

      <FloatingCountdown
        targetISO={clientConfig.event.countdownTargetISO}
        ctaLabel="Register Free"
      />

      {/* Free-registration modal — opened by any [data-register-cta] element. */}
      <RegisterModal config={clientConfig} />
    </>
  );
}
