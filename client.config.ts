/**
 * Ketan BizLife — Landing Page Client Config
 *
 * Single source of truth for ALL copy, prices, dates, URLs, claim toggles, and
 * brand fields. Components are pure presentation and never contain hardcoded
 * client strings. To change a word on the site, edit this file.
 *
 * Prices, dates, and bump amounts are wired to NEXT_PUBLIC_* environment
 * variables with sensible fallbacks. Update them in .env.local (dev) or the
 * Vercel dashboard (prod) to roll changes across the entire funnel without
 * code edits. See .env.local for the full list.
 */

// ----- Env-driven knobs -----------------------------------------------------

const num = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const str = (raw: string | undefined, fallback: string): string => {
  const v = (raw ?? "").trim();
  return v.length > 0 ? v : fallback;
};

const formatINR = (n: number): string => `₹${n.toLocaleString("en-IN")}`;

const WEBINAR_PRICE = num(process.env.NEXT_PUBLIC_WEBINAR_PRICE, 99);
const WEBINAR_ANCHOR_PRICE = num(
  process.env.NEXT_PUBLIC_WEBINAR_ANCHOR_PRICE,
  499,
);
const WEBINAR_DATE_LABEL = str(
  process.env.NEXT_PUBLIC_WEBINAR_DATE_LABEL,
  "Sunday, 31st May 2026",
);
/**
 * Short-form date (no year) used in the Hero info card and the Transformation
 * outro where a tight chip-style date reads better than the full label.
 * Update this in lockstep with WEBINAR_DATE_LABEL on every webinar rollover.
 */
const WEBINAR_DATE_SHORT_LABEL = str(
  process.env.NEXT_PUBLIC_WEBINAR_DATE_SHORT_LABEL,
  "Sunday, 31st May",
);
const WEBINAR_TIME_LABEL = str(
  process.env.NEXT_PUBLIC_WEBINAR_TIME_LABEL,
  "10:45 AM IST",
);
const WEBINAR_COUNTDOWN_ISO = str(
  process.env.NEXT_PUBLIC_WEBINAR_COUNTDOWN_ISO,
  "2026-05-31T10:45:00+05:30",
);
/** Length of the webinar in minutes. Used to compute the calendar event end time. */
const WEBINAR_DURATION_MINUTES = num(
  process.env.NEXT_PUBLIC_WEBINAR_DURATION_MINUTES,
  180,
);

// ⚠️ PRESERVED FOR A FUTURE OTO (one-time-offer) PAGE — the main funnel is now
// 100% free and does NOT render any of these paid add-ons. Kept here (not
// deleted) so the OTO page can reuse the offer data + prices unchanged.
const BUMP_PRICES = {
  buyerQualification: num(
    process.env.NEXT_PUBLIC_BUMP_BUYER_QUALIFICATION_PRICE,
    199,
  ),
  negotiationScripts: num(
    process.env.NEXT_PUBLIC_BUMP_NEGOTIATION_SCRIPTS_PRICE,
    199,
  ),
  paymentTerms: num(
    process.env.NEXT_PUBLIC_BUMP_PAYMENT_TERMS_PRICE,
    199,
  ),
  closersBundle: num(
    process.env.NEXT_PUBLIC_BUMP_CLOSERS_BUNDLE_PRICE,
    499,
  ),
};

// Meta event names fired on a successful free registration. Standard event is
// the canonical Meta token "CompleteRegistration" (no space — a space would
// make Meta treat it as a custom event and lose standard-event optimization).
// Custom event is the internal label our media buyers optimize against.
// NEXT_PUBLIC_ so both the browser pixel and (via clientConfig) the server CAPI
// read the exact same values.
const FREE_STANDARD_EVENT = str(
  process.env.NEXT_PUBLIC_FREE_STANDARD_EVENT,
  "CompleteRegistration",
);
const FREE_CUSTOM_EVENT = str(
  process.env.NEXT_PUBLIC_FREE_CUSTOM_EVENT,
  "FreeWebinarRegistration",
);

// Meta event names fired on a successful PAID OTO purchase (/free/checkout).
// Standard event is the canonical Meta "Purchase" token; custom event is the
// internal label for the one-time-offer upsell.
const OTO_STANDARD_EVENT = str(
  process.env.NEXT_PUBLIC_OTO_STANDARD_EVENT,
  "Purchase",
);
const OTO_CUSTOM_EVENT = str(
  process.env.NEXT_PUBLIC_OTO_CUSTOM_EVENT,
  "OTOPurchase",
);

// ----- Types -----------------------------------------------------------------

export interface StatCard {
  value: string;
  label: string;
}

export interface SegmentCard {
  icon: string;
  badge: string;
  identityLead: string;
  ticksHeading: string;
  bullets: string[];
  outcome: string;
}

export interface AgendaBlock {
  /** Optional. Older copy had hour-by-hour times; the new copy drops them. */
  time?: string;
  label: string;
  title: string;
  bullets: string[];
}

export interface TransformationRow {
  old: string;
  next: string;
}

export interface VideoTestimonial {
  id: string;
  /** Wistia media ID (e.g. "txhwzn9b7s"). Set this OR vimeoId. */
  wistiaId?: string;
  /** Vimeo video ID (e.g. "1151505324"). Set this OR wistiaId. */
  vimeoId?: string;
  /** Direct MP4 URL (e.g. a DigitalOcean Spaces CDN link). Set this OR
   *  wistiaId/vimeoId. The card poster is the video's ~0.1s frame (shown via a
   *  muted <video> element) and playback uses a native HTML5 <video>. */
  mp4Src?: string;
  /** When true, hide this video on tablet + desktop (>=640px). */
  mobileOnly?: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface BonusCard {
  /** Visual slug — maps to BonusIllustration component variant */
  illustration:
    | "verification"
    | "fob"
    | "community"
    | "lms"
    | "recording";
  label: string;
  title: string;
  description: string;
}

export interface CheckoutBump {
  id: string;
  title: string;
  price: number;
  tagline: string;
  intro: string;
  bullets: string[];
  insight?: string;
  callToAction?: string;
  /** When true, selecting this bump deselects all other bumps. */
  isBundle?: boolean;
  /** OTO perk-card image in /public (generate via the provided prompts). */
  image?: string;
  /** Short one-liner shown under the title on the OTO perk card. */
  otoTagline?: string;
}

export interface ClientConfig {
  brand: {
    name: string;
    tagline: string;
    domain: string;
    region: string;
    language: string;
    currency: string;
    timezone: string;
  };

  funnel: {
    slug: string;
    sessionStorageKey: string;
    utmFields: readonly string[];
  };

  pricing: {
    price: number;
    anchorPrice: number;
    pabblyAmountString: string;
    currency: string;
    todayOnlyLabel: string;
  };

  event: {
    dateLabel: string;
    /** Short-form date (no year) — for tight UI surfaces. */
    dateShortLabel: string;
    countdownTargetISO: string;
    timeLabel: string;
    timezone: string;
    platform: string;
    language: string;
    durationLabel: string;
    /** Webinar length in minutes; used for calendar event end time. */
    durationMinutes: number;
  };

  hero: {
    variant: "A" | "B";
    preHeaderFlag: string;
    hindiBanner: string;
    headlineLead: string;
    headlinePunchLines: string[];
    statHeadline: string;
    statLines: string[];
    withoutStack: string;
    /** Uppercase kicker label rendered above the withoutItems chip strip. */
    withoutHeading: string;
    /** Short failed-tactic chips rendered below the hero CTA (premium pill row). */
    withoutItems: string[];
    promiseText: string;
    promiseFrameworkName: string;
    countdownLabel: string;
    eventDetailsLine: string;
    priceAnchor: string;
    priceActual: string;
    priceSuffix: string;
    primaryCtaText: string;
    trustLine: string;
    refundLine: string;
    moneyBackBadge: {
      title: string;
      body: string;
    };
  };

  scenes: {
    heading: string;
    scenes: string[];
    outro: string;
  };

  who: {
    heading: string;
    intro: string;
    segments: [SegmentCard, SegmentCard];
    closingLine: string;
    ctaText: string;
  };

  agenda: {
    heading: string;
    subheading: string;
    blocks: AgendaBlock[];
    ctaText: string;
  };

  transformation: {
    heading: string;
    headerOld: string;
    headerNext: string;
    rows: TransformationRow[];
    outro: string;
  };

  identityBadges: {
    heading: string;
    badges: string[];
    outro: string;
    ctaText: string;
  };

  bonuses: {
    eyebrow: string;
    heading: string;
    subheading: string;
    cards: BonusCard[];
  };

  about: {
    eyebrow: string;
    headline: string;
    body: string;
    stats: StatCard[];
    marqueeItems: string[];
    visualCaption: string;
  };

  testimonials: {
    eyebrow: string;
    heading: string;
    videos: VideoTestimonial[];
  };

  guarantee: {
    badge: string;
    heading: string;
    paragraphs: string[];
    ctaText: string;
  };

  antiPositioning: {
    heading: string;
    items: string[];
  };

  faq: {
    heading: string;
    items: FaqItem[];
  };

  finalCta: {
    heading: string;
    guaranteeLine: string;
    antiQualifierHeading: string;
    antiQualifierItems: string[];
    closing: string;
    ctaText: string;
    fineprint: string;
  };

  checkout: {
    productTitle: string;
    productByline: string;
    productMeta: string;
    bonusesHeading: string;
    bumpsHeading: string;
    bumpsSubheading: string;
    bumps: CheckoutBump[];
  };

  /** Standalone paid OTO (one-time-offer) upsell page at /free/oto. */
  oto: {
    badge: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    skipText: string;
    perksHeading: string;
    perksSubheading: string;
    founderHeading: string;
    founder: {
      name: string;
      role: string;
      image: string;
      bio: string[];
    };
    faqHeading: string;
    faq: FaqItem[];
    closingHeading: string;
    closingBody: string;
    /** Sticky cart button label (count + total appended in the UI). */
    stickyCtaText: string;
    emptyNote: string;
    securityNote: string;
    /** Post-purchase (paid addons) confirmation page. */
    thankYou: {
      eyebrow: string;
      heading: string;
      lead: string;
      purchasedHeading: string;
      stepsHeading: string;
      steps: { title: string; body: string }[];
      whatsappHeading: string;
      whatsappSub: string;
      whatsappCtaLabel: string;
      closing: string;
    };
    /** WhatsApp community invite for the OTO thank-you page (own env var). */
    whatsappCommunityUrl: string;
  };

  footer: {
    copyright: string;
    legalLinks: { label: string; href: string }[];
    disclaimer: string;
  };

  social: {
    instagram: string;
    youtube: string;
    linkedin: string;
    twitter: string;
    whatsappChannel: string;
  };

  community: {
    whatsappGroupUrl: string;
    fallbackMessage: string;
  };

  analytics: {
    gaMeasurementId: string;
    clarityProjectId: string;
    metaPixelId: string;
  };

  capi: {
    enabled: boolean;
    /** Meta standard event token for free registration (e.g. "CompleteRegistration"). */
    standardEvent: string;
    /** Internal custom event name for free registration (e.g. "FreeWebinarRegistration"). */
    customEvent: string;
    /** Meta standard event for a paid OTO purchase (e.g. "Purchase"). */
    otoStandardEvent: string;
    /** Internal custom event for a paid OTO purchase (e.g. "OTOPurchase"). */
    otoCustomEvent: string;
    /** Optional category sent in custom_data.kind (e.g. "webinar"). Empty = omit. */
    kind: string;
  };

  approvalItems: {
    showHundredCroreClaim: boolean;
    showNineCountriesStat: boolean;
    trainedCountClaim: string | null;
    showRefundLine: boolean;
    showCompetitorAntiPositioning: boolean;
  };
}

// ----- Config ----------------------------------------------------------------

export const clientConfig: ClientConfig = {
  brand: {
    name: "Ketan BizLife",
    tagline: "Export Unstuck · Learn · Connect · Grow",
    domain: "export.ketanbizlife.in",
    region: "India",
    language: "Hindi-English",
    currency: "INR",
    timezone: "Asia/Kolkata",
  },

  funnel: {
    slug: "free",
    sessionStorageKey: "ketan_utm",
    utmFields: [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ] as const,
  },

  pricing: {
    price: WEBINAR_PRICE,
    anchorPrice: WEBINAR_ANCHOR_PRICE,
    pabblyAmountString: String(WEBINAR_PRICE),
    currency: "INR",
    todayOnlyLabel: "today only",
  },

  event: {
    dateLabel: WEBINAR_DATE_LABEL,
    dateShortLabel: WEBINAR_DATE_SHORT_LABEL,
    countdownTargetISO: WEBINAR_COUNTDOWN_ISO,
    timeLabel: WEBINAR_TIME_LABEL,
    timezone: "Asia/Kolkata",
    platform: "Live on Zoom",
    language: "Hindi",
    durationLabel: "3 ghante actionable content",
    durationMinutes: WEBINAR_DURATION_MINUTES,
  },

  // -------- HERO --------
  hero: {
    variant: "A",
    preHeaderFlag:
      "For Indian Manufacturers, Traders & Sourcing Agents Doing Goods Export",
    hindiBanner: "Export शुरू किया… पर result नहीं आ रहा?",
    headlineLead:
      "For Indian Exporters Who Are Still Struggling to Find Real Buyers",
    headlinePunchLines: [
      "8 Out of 10 Exporters Fail.",
      "Not Because of Documents, But Because They Don't Know How to Find Real Buyers?",
    ],
    statHeadline: "Join India's Most Practical Export Webinar.",
    statLines: [
      "Learn 2 proven buyer-finding systems that can help you get genuine international orders in just 1 day.",
    ],
    withoutStack:
      "Without Embassy contacts. Without Google searches. Without B2B portal traps. Without Port Data scams. Without 1-year guarantee gimmicks.",
    withoutHeading: "No More of This",
    withoutItems: [
      "Embassy Contacts",
      "Google Searches",
      "B2B Portal Traps",
      "Port Data Scams",
      "1-Year Guarantee Gimmicks",
    ],
    promiseText:
      `${WEBINAR_DATE_LABEL}. 3 ghante live Zoom webinar. 2 proven buyer-finding systems that can help you get genuine international orders. Wahi system jo Mein 10+ saal se 2 export brands ke saath use kar raha hoon.`,
    promiseFrameworkName: "",
    countdownLabel: "Webinar shuru hone mein",
    eventDetailsLine: `Date: ${WEBINAR_DATE_LABEL}   ·   Time: ${WEBINAR_TIME_LABEL}   ·   Venue: Live on Zoom   ·   Language: Hindi`,
    priceAnchor: formatINR(WEBINAR_ANCHOR_PRICE),
    priceActual: "Free",
    priceSuffix: "limited seats",
    primaryCtaText: "Register Free",
    trustLine: "Live on Zoom · Hindi me · 3 ghante actionable content",
    refundLine:
      "100% Free. Koi credit card nahi. Koi hidden charge nahi.",
    moneyBackBadge: {
      title: "100% Free Registration",
      body:
        "Koi payment nahi, koi credit card nahi. Bas apni details do aur seat reserve karo.",
    },
  },

  // -------- SECTION 2 — Scenes Recall --------
  scenes: {
    heading: "Kya Aapne Bhi Yeh Face Kiya Hai?",
    scenes: [
      "Tuesday raat 11 baje. Phone vibrate hua. “Hello, this is Mohamed from Dubai. I need your product catalog.” Tumne 4 minute mein reply kiya. Phir silence. Pura week silence. Aaj tak silence.",
      "Monday morning. 6 ghante Excel mein quote banaya. ₹4.5 lakh ka order. PDF bheja. Read receipt aaya. Reply nahi.",
      "Gulf Food exhibition. 3 din wahaan khade rahe. 200 cards baant diye. Aaj tak ek call back nahi aaya. Sirf “we will get back” wale emails.",
    ],
    outro: "Yeh exactly woh moments hain jo iss webinar mein solve hote hain.",
  },

  // -------- SECTION 3 — Who This Is For --------
  who: {
    heading: "Yeh Webinar Tumhare Liye Hai Agar…",
    intro: "Read the one that sounds like your situation.",
    segments: [
      {
        icon: "🏭",
        badge: "SEGMENT 1",
        identityLead:
          "Tum manufacturer, trader, ya sourcing agent ho. Abhi tak pehla real international order nahi aaya.",
        ticksHeading: "You ticked these boxes?",
        bullets: [
          "IEC done. GST done. Documentation pura. Abhi tak ek bhi real international buyer nahi mila.",
          "B2B portals pe paise lagaye. Sirf fake inquiries.",
          "Exhibitions me ja chuke. Card baant ke aaye. Ek bhi call back nahi.",
          "Kisi coach ne spice, fruit, ya vegetable mein dhakel diya.",
          "Ghar walo ko 6 mahine se “abhi process mein hai” bol rahe ho.",
        ],
        outcome:
          "This webinar gives you the buyer-finding plus buyer communication system to crack your first real international order.",
      },
      {
        icon: "📦",
        badge: "SEGMENT 2",
        identityLead:
          "Tum already export kar rahe ho. 1 container har 2-3 mahine. Lekin scale nahi ho raha.",
        ticksHeading: "You’re stuck here?",
        bullets: [
          "Ek container nikalta hai, phir 2-3 mahine kuch nahi hota.",
          "Same buyer baar baar order nahi karta. Naye buyer lane ki system nahi hai.",
          "Daily 3-4 inquiries Excel mein likhi hain. Follow-up tracking nahi hai.",
          "Tumhara product regular hai jisme margin 3-5%. Thak gaye ho.",
          "Pehle system clear chahiye, phir scaling community join karna chahte ho.",
        ],
        outcome:
          "This webinar fixes the problem of not getting consistent buyers and gives you the follow-up approach that converts.",
      },
    ],
    closingLine: "Different starting points. One framework. One Sunday.",
    ctaText: "Register Free",
  },

  // -------- SECTION 4 — What This 3-Hour Webinar Covers --------
  agenda: {
    heading: "What This 3-Hour Webinar Covers",
    subheading:
      `Live Webinar · ${WEBINAR_DATE_LABEL} · ${WEBINAR_TIME_LABEL} · Zoom. Four content blocks across 3 hours. You leave with a system, not just notes.`,
    blocks: [
      {
        label: "BLOCK 1",
        title: "Diagnosis: The 3 Mistakes Killing Your Export Business",
        bullets: [
          "Why your B2B portal inquiries are 90% fake (and how to filter them in 30 seconds)",
          "Why your follow-up system is broken (and how to build a relationship with the buyer)",
          "Why your communication weakens at “discount?” or “credit?” (and how to fix it)",
        ],
      },
      {
        label: "BLOCK 2",
        title: "How to Handle Buyer Conversations That Convert",
        bullets: [
          "Why buyers ghost after you send price (and the question framework that prevents it)",
          "Sample, credit, and discount objection responses that build trust instead of losing the deal",
          "Building rapport BEFORE pricing (so the buyer doesn’t use your price as ammunition with their regular supplier)",
        ],
      },
      {
        label: "BLOCK 3",
        title: "The 2 Real Buyer-Finding Systems",
        bullets: [
          "Real buyer-finding systems that you haven't seen anywhere in any webinar",
        ],
      },
      {
        label: "BLOCK 4",
        title: "Country-Specific Follow-Up Approach",
        bullets: [
          "Gulf: relationship-driven 3-5 month follow-up cycles",
          "US: fast, professional, number-driven decisions",
          "Africa: quick 15-20 day decision cycles, long-term once locked",
          "Europe: heavy documentation, quality-first conversations",
        ],
      },
    ],
    ctaText: "Register Free",
  },

  // -------- SECTION 5 — Old You vs New You --------
  transformation: {
    heading: "Old You vs New You",
    headerOld: "BEFORE SUNDAY",
    headerNext: "AFTER SUNDAY",
    rows: [
      {
        old: "Daily price quote bhej rahe ho. Buyer gayab ho raha hai.",
        next: "Question framework se buyer engage ho raha hai. Ghosting kam ho rahi hai.",
      },
      {
        old: "Buyer puchhe “discount?” ya “credit?”. Tum stuck ho jaate ho.",
        next: "Confidence se discount, credit, sample objections handle kar rahe ho.",
      },
      {
        old: "Ghar walo ko 6 mahine se “process mein hai” bolna padta hai.",
        next: "Pehla international order ka clear roadmap hai. Family ko proof dikha sakte ho.",
      },
      {
        old: "2-3 lakh laga chuke ho courses, portals, exhibitions mein. ROI zero.",
        next: "Bilkul free actual system: 2 buyer-finding techniques + buyer communication + country-specific follow-up.",
      },
      {
        old: "Coach hone ka drama dekh chuke. Trust khatam.",
        next: "Real exporter dekha jo padhata bhi hai. 2 export brands, ₹100+ crore in shipments.",
      },
    ],
    outro: "Ek Sunday. Bilkul Free. Live webinar.",
  },

  // -------- SECTION 6 — Identity Outcomes --------
  identityBadges: {
    heading: "After This Sunday, Tum Wahi Exporter Ban Jaate Ho Jo…",
    badges: [
      "…buyer ke “send your price” message ka professional reply de sakta hai. Without giving the actual price first.",
      "…Meta Ads Library mein search karke real importers shortlist kar sakta hai. Apne product category mein.",
      "…buyer ke “discount?” ya “credit?” objection ka counter-question approach jaanta hai.",
      "…follow-up ko system se chalata hai, mood se nahi. Country-specific timelines pata hain.",
    ],
    outro: `${WEBINAR_DATE_SHORT_LABEL}. Bilkul Free. Live webinar.`,
    ctaText: "Register Free",
  },

  // -------- SECTION 7 — Bonuses (NEW) --------
  bonuses: {
    eyebrow: "Included Free",
    heading: "What You Also Get",
    subheading:
      "Webinar plus 5 bonuses included free with your registration.",
    cards: [
      {
        illustration: "verification",
        label: "Bonus 01",
        title: "5-Step Buyer Verification Checklist",
        description: "Avoid fraud buyers. Save lakhs in losses.",
      },
      {
        illustration: "fob",
        label: "Bonus 02",
        title: "Perfect FOB Price Calculation Sheet",
        description:
          "Price confidently without undercutting or losing profit.",
      },
      {
        illustration: "community",
        label: "Bonus 03",
        title: "Access to Premium WhatsApp Communities",
        description:
          "Network with serious exporters, not beginners asking basics.",
      },
      {
        illustration: "lms",
        label: "Bonus 04",
        title: "Mobile App & Web LMS Portal Access",
        description: "Learn anytime, anywhere with structured content.",
      },
      {
        illustration: "recording",
        label: "Bonus 05",
        title: "1-Year Recording Access",
        description: "Revise and implement at your own pace.",
      },
    ],
  },

  // -------- SECTION 8 — About Ketan --------
  about: {
    eyebrow: "About Ketan",
    headline: "Mein Bhi Wahin Tha Jahaan Aap Aaj Ho.",
    body:
      "Mein bhi struggle kiya. Courses kiye. Portals try kiye. Exhibitions attend ki. Agents ko commission diya. Zero result.\n\nSlowly, jo kaam nahi karta tha woh chhoda. Jo kaam karta tha woh systematized kiya. Buyer-finding ke 2 methods nikle jo actually genuine importers tak le jaate hain. Buyer communication ka approach develop kiya jo ghosting, credit demands, aur sample requests sambhalta hai.\n\nAaj 2 export brands chalata hoon. Saath mein financial advisory company hai (Madhusudan Tax and Wealth Management). Indian exporters ke saath wahi system share karta hoon jo Mein khud daily use karta hoon.",
    stats: [
      { value: "10+ Years", label: "Hands-on Goods Export Experience" },
      { value: "2 Brands", label: "Active Export Operations" },
      { value: "100+ Cr", label: "Cumulative Export Volume" },
      { value: "9+ Countries", label: "Gulf · Africa · Southeast Asia" },
    ],
    marqueeItems: [
      "Madhusudan",
      "10+ Years Export",
      "Gulf",
      "Africa",
      "Southeast Asia",
      "Tiles",
      "Ceramic",
      "Building Materials",
      "Display Systems",
      "₹100+ Crore Shipped",
    ],
    visualCaption:
      "Illustrative placeholder. Container B-roll and factory walkthrough drop in once Ketan delivers footage.",
  },

  // -------- SECTION 9 — Testimonials --------
  testimonials: {
    eyebrow: "Testimonials",
    heading: "Real Indian Exporters Who Used This System",
    videos: [
      { id: "testimonial-viren", vimeoId: "1151505324", mobileOnly: true },
      { id: "testimonial-1", wistiaId: "txhwzn9b7s" },
      {
        id: "testimonial-2",
        mp4Src:
          "https://tgox-production-bucket.nyc3.cdn.digitaloceanspaces.com/client_funnel_videos/Ketan/review_yashvardhan_rajpurohit%20(540p).mp4",
      },
      { id: "testimonial-3", wistiaId: "7sde1semev" },
      { id: "testimonial-4", wistiaId: "pqfqrzkpa1" },
      { id: "testimonial-5", wistiaId: "w84s07ardv" },
      {
        id: "testimonial-6",
        mp4Src:
          "https://tgox-production-bucket.nyc3.cdn.digitaloceanspaces.com/client_funnel_videos/Ketan/Review_Manu_Bhutani.mp4",
      },
    ],
  },

  // -------- SECTION 10 — (removed) Money-Back Guarantee --------
  // The funnel is now 100% free, so there is nothing to refund. This block is
  // no longer rendered (GuaranteeSection was removed from the page). Kept as a
  // neutral, free-friendly stub so the ClientConfig type stays satisfied.
  guarantee: {
    badge: "100% Free Registration",
    heading: "Bilkul Free. Koi Hidden Charge Nahi.",
    paragraphs: [
      "Yeh webinar bilkul free hai. Koi payment nahi, koi credit card nahi. Bas apni details do aur seat reserve karo.",
      "Sunday ko 3 ghante live join karo — wahi system jo Mein 10+ saal se 2 export brands ke saath use karta hoon.",
    ],
    ctaText: "Register Free",
  },

  // -------- SECTION 11 — Anti-Positioning --------
  antiPositioning: {
    heading: "Yeh Webinar Aapko NAHI Sikhayega",
    items: [
      "IEC ya GST registration kaise karte hain. Yeh aapka CA already kar chuka hai.",
      "“Overnight crorepati” banne ka jhootha vaada. Real first-order ka realistic timeline 1 se 3 mahine hai.",
      "Spice, fruit, ya vegetable export ka push. Yeh hum aapko nahi dhakelte.",
      "10-saal purani buyer lists. Hum aapko methods sikhate hain, lists nahi bechtey.",
      "Mandatory subscription ya 12-mahine ka ad lock-in. Yeh webinar bilkul free hai, sirf ek Sunday ki commitment.",
    ],
  },

  // -------- SECTION 12 — FAQ --------
  faq: {
    heading: "Frequently Asked Questions",
    items: [
      {
        question: "Yeh webinar kis ke liye hai?",
        answer:
          "Indian manufacturers, traders, aur sourcing agents jo physical goods export karna chahte hain. Doesn’t matter agar aapne abhi tak ek bhi order nahi kiya ya already 1 container har 2-3 mahine kar rahe ho.",
      },
      {
        question: "Recording milegi agar Sunday miss kar diya?",
        answer:
          "Haan. Sabhi registered attendees ko 1-Year Recording Access milta hai. Lekin live attend karna best hai. Recording aapka backup hai.",
      },
      {
        question: "Yeh webinar sach mein free hai? Koi hidden charge to nahi?",
        answer:
          "Haan, bilkul free. Koi payment nahi, koi credit card nahi, koi hidden charge nahi. Bas apna naam, email aur WhatsApp number do — seat reserve ho jaayegi aur Zoom link WhatsApp pe aa jaayega.",
      },
      {
        question: "Hindi mein hoga ya English mein?",
        answer:
          "Hinglish mein. Hindi plus English mix. Technical terms English mein, experience based content Hindi mein.",
      },
      {
        question: "Kya Ketan tile aur ceramic ke alawa baaki goods bhi sikhata hai?",
        answer:
          "Haan. Methods aur frameworks product-agnostic hain. Tile, building materials, auto parts, PVC, machinery. Koi bhi physical goods. Live demo mein different categories ke examples aate hain.",
      },
      {
        question: "Kya yeh same as portals?",
        answer:
          "Bilkul opposite. Portals aapko inquiries dete hain (jo 90% fake hote hain). Yeh webinar aapko methods sikhata hai jisme aap directly real buyers tak pahunch sakte ho, without depending on portals.",
      },
    ],
  },

  // -------- SECTION 13 — Final CTA + Anti-Qualifier --------
  finalCta: {
    heading: `Bilkul Free. ${WEBINAR_DATE_LABEL}. 3 ghante. Ek decision.`,
    guaranteeLine:
      "100% Free. Koi credit card nahi. Koi hidden charge nahi. Seats limited hain.",
    antiQualifierHeading: "Don’t Register If…",
    antiQualifierItems: [
      "Aapko documentation aur IEC ka basic course chahiye. Yeh webinar wahaan se shuru nahi karta.",
      "Aap “overnight crorepati” formula dhundhte ho. Real exporters 1 se 3 mahine lete hain pehla order land karne mein.",
      "Aap spice, fruit, ya vegetable export specialist banna chahte ho. Yeh webinar physical hard goods ke liye optimized hai.",
    ],
    closing: "Agar Yeh Sab Aapke Liye OK Hai, Tab:",
    ctaText: "Register Free",
    fineprint:
      "Free registration. Zoom link aur reminders aapke WhatsApp aur email pe aayenge.",
  },

  // -------- CHECKOUT (legacy) --------
  // ⚠️ The free funnel has NO checkout page — registration happens in a modal
  // and the webinar is free. This whole block is retained ONLY so the paid
  // `bumps` offers below survive for a future OTO (one-time-offer) page. The
  // non-bump strings here are not rendered anywhere in the free funnel.
  checkout: {
    productTitle: "The Export Unstuck 1-Day Webinar",
    productByline: "By Ketan Bizlife",
    productMeta:
      `${WEBINAR_DATE_LABEL} · ${WEBINAR_TIME_LABEL} · Live on Zoom · Hindi`,
    bonusesHeading: "5 Free Bonuses Included With Your Free Registration",
    bumpsHeading: "Smart Add-ons (Optional)",
    bumpsSubheading:
      "Tools that turn what you learn on Sunday into closed deals next week.",
    // --- Paid OTO offers — preserved for the future one-time-offer page. ---
    bumps: [
      {
        id: "buyer-qualification",
        title: "Export Buyer Qualification Checklist",
        price: BUMP_PRICES.buyerQualification,
        tagline: "ONE-TIME OFFER",
        intro: "Instantly know which buyers are worth your time.",
        bullets: [
          "Identify serious buyers vs time-pass inquiries",
          "Know who to reply to, who to ignore, and who to test",
          "Check buyer intent, credibility, and buying capacity in minutes",
          "Reduce payment risk before sending quotes or samples",
        ],
        insight:
          "Most exporters don’t lose deals. They lose time on the wrong buyers.",
        callToAction:
          "Use this checklist immediately after Sunday’s webinar.",
        image: "/oto/buyer-qualification.webp",
        otoTagline: "Spot serious buyers in minutes — stop wasting time on time-passers.",
      },
      {
        id: "negotiation-scripts",
        title: "Export Sales Negotiation Scripts",
        price: BUMP_PRICES.negotiationScripts,
        tagline: "ONE-TIME OFFER",
        intro:
          "Never get stuck when buyers ask uncomfortable questions.",
        bullets: [
          "Ready-to-use WhatsApp, email, and call scripts",
          "Exact replies for discount, credit, and free sample requests",
          "Say the right words without sounding desperate or unprofessional",
          "Close deals faster with proven exporter conversations",
        ],
        insight:
          "Confidence comes from knowing exactly what to say. Not guessing.",
        callToAction: "Copy. Paste. Send. Done.",
        image: "/oto/negotiation-scripts.webp",
        otoTagline: "Word-for-word replies for discount, credit & sample requests.",
      },
      {
        id: "payment-terms",
        title: "Payment Terms Negotiation Guide (eBook)",
        price: BUMP_PRICES.paymentTerms,
        tagline: "ONE-TIME OFFER",
        intro: "Protect your money before you ship your goods.",
        bullets: [
          "Understand advance, LC, credit, and risky payment terms",
          "Learn when to accept, negotiate, or refuse payment conditions",
          "Avoid buyer tricks that cause delays and defaults",
          "Use ready-made scripts to handle payment talks confidently",
        ],
        insight:
          "One wrong payment decision can erase months of hard work.",
        callToAction: "Highly recommended before your first export order.",
        image: "/oto/payment-terms.webp",
        otoTagline: "Protect your money — master advance, LC & credit terms.",
      },
      {
        id: "closers-bundle",
        title: "The Export Closer’s Pack — All 3 Together",
        price: BUMP_PRICES.closersBundle,
        tagline: "BEST VALUE · BUNDLE · SAVE ₹98",
        intro: "All 3 tools above in one bundle:",
        bullets: [
          "Export Buyer Qualification Checklist (₹199)",
          "Export Sales Negotiation Scripts (₹199)",
          "Payment Terms Negotiation Guide eBook (₹199)",
        ],
        insight:
          "Individually: ₹597. Bundle today: ₹499. Webinar mein system seekhoge. In tools mein exact words milenge.",
        callToAction: "Tick only this one to get all 3.",
        isBundle: true,
        image: "/oto/closers-bundle.webp",
        otoTagline: "All three tools together at the best value.",
      },
    ],
  },

  // -------- OTO (paid one-time-offer upsell) --------
  oto: {
    badge: "Limited · One-Time Offer",
    eyebrow: "Special upgrade for registered exporters",
    heading: "Turn What You Learn Into Closed Deals — Faster",
    subheading:
      "You’ve booked your seat. Now add the exact done-for-you tools Ketan uses to qualify buyers, handle objections, and lock payment terms. Available at this price on this page only.",
    skipText: "No thanks, I’ll continue without the tools",
    perksHeading: "Pick The Tools You Want",
    perksSubheading:
      "Tap to add. Each tool works on its own — or grab the bundle and save. Yeh ek-baar ka offer hai.",
    founderHeading: "Who’s Behind These Tools",
    founder: {
      name: "Ketan Vadariya",
      role: "Export Mentor · 10+ Years · 2 Export Brands",
      image: "/ketan-hero.jpeg",
      bio: [
        "Ketan runs 2 active export brands and a financial advisory firm (Madhusudan Tax and Wealth Management), with 10+ years of hands-on goods-export experience across the Gulf, Africa, and Southeast Asia — ₹100+ crore in cumulative shipments.",
        "These tools aren’t theory. They’re the exact checklists, scripts, and guides Ketan and his team use daily to qualify real buyers, handle discount and credit objections, and protect payment before shipping.",
      ],
    },
    faqHeading: "Before You Add — Quick Answers",
    faq: [
      {
        question: "What exactly am I getting?",
        answer:
          "Ready-to-use export tools — a buyer qualification checklist, negotiation scripts, and a payment-terms guide — delivered digitally right after payment. Add them individually or as a discounted bundle.",
      },
      {
        question: "Is this a one-time payment?",
        answer:
          "Yes. It’s a single one-time payment for the tools you select. No subscription, no recurring charges.",
      },
      {
        question: "Is the payment secure?",
        answer:
          "Payment is processed securely by Cashfree (UPI, cards, net banking, wallets) under PCI DSS standards. Your card details never touch our servers.",
      },
    ],
    closingHeading: "Add The Tools Now — This Price Is Only On This Page",
    closingBody:
      "Once you leave this page, these tools go back to full price. Select what you want and continue to secure checkout.",
    stickyCtaText: "Get The Addons",
    emptyNote: "Tap a tool above to add it to your order.",
    securityNote: "Secure one-time payment by Cashfree · UPI, Cards, Net Banking, Wallets",
    thankYou: {
      eyebrow: "Payment confirmed",
      heading: "You’re all set — your tools are on the way.",
      lead: "Thank you! Your payment was successful and your export tools are being delivered to your email and WhatsApp right now.",
      purchasedHeading: "What you just unlocked",
      stepsHeading: "What happens next",
      steps: [
        {
          title: "Check your email & WhatsApp",
          body: "Your tools are delivered digitally to the email and WhatsApp number you used at checkout — usually within a couple of minutes.",
        },
        {
          title: "Save them for Sunday",
          body: "Keep these handy during the live webinar — you’ll know exactly where to apply each one as Ketan walks through the system.",
        },
      ],
      whatsappHeading: "One Last Step — Join the WhatsApp Community",
      whatsappSub: "This is where your Zoom link, reminders, tool downloads, and live Q&A queue drop. Don’t skip this — join now so you don’t miss anything.",
      whatsappCtaLabel: "Join the WhatsApp Community",
      closing: "See you inside. — Ketan",
    },
    // Rotated every ~2 weeks. Set NEXT_PUBLIC_OTO_WHATSAPP_COMMUNITY_URL to
    // roll without a code change. Defaults to the same community link as the
    // free funnel.
    whatsappCommunityUrl: str(
      process.env.NEXT_PUBLIC_OTO_WHATSAPP_COMMUNITY_URL,
      "https://chat.whatsapp.com/LjNwhbgRIzfJaJhMFfnS96",
    ),
  },

  // -------- FOOTER --------
  footer: {
    copyright: "© 2026 Ketan BizLife Pvt Ltd. All rights reserved.",
    legalLinks: [
      { label: "Privacy Policy", href: "/free/privacy" },
      { label: "Terms & Conditions", href: "/free/terms" },
    ],
    disclaimer:
      "Disclaimer: Results vary based on individual effort, product category, and market conditions. This webinar teaches a framework and system; outcomes depend on consistent application. No guaranteed income claims are made.",
  },

  social: {
    instagram: "",
    youtube: "",
    linkedin: "",
    twitter: "",
    whatsappChannel: "",
  },

  community: {
    // Rotated every ~2 weeks. Set NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL in Vercel
    // to the new invite link to roll without a code change. The hardcoded
    // fallback is the dev-time default and the last-known-good production
    // value if the env var is ever unset.
    whatsappGroupUrl: str(
      process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL,
      "https://chat.whatsapp.com/LjNwhbgRIzfJaJhMFfnS96",
    ),
    fallbackMessage:
      "WhatsApp group invite + Zoom link will reach you 30 minutes before the webinar.",
  },

  analytics: {
    gaMeasurementId: str(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, ""),
    clarityProjectId: str(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID, ""),
    metaPixelId: str(process.env.META_PIXEL_ID, ""),
  },

  capi: {
    enabled: true,
    standardEvent: FREE_STANDARD_EVENT,
    customEvent: FREE_CUSTOM_EVENT,
    otoStandardEvent: OTO_STANDARD_EVENT,
    otoCustomEvent: OTO_CUSTOM_EVENT,
    kind: "webinar",
  },

  approvalItems: {
    showHundredCroreClaim: true,
    showNineCountriesStat: true,
    trainedCountClaim: null,
    showRefundLine: true,
    showCompetitorAntiPositioning: true,
  },
};
