/**
 * Phone dial codes for the country selectors (registration modal + OTO
 * checkout). India first (default), then the export markets that matter most
 * for this audience (Gulf, US/UK, Africa, SE Asia, EU), then the rest.
 *
 * `value` is the "+dial" prefix concatenated with the local number for
 * libphonenumber validation, so each dial code appears once (shared codes like
 * +1 use a combined label). Flag emoji render on Android / iOS (our audience)
 * and degrade to the ISO letters on Windows desktop.
 */
export interface CountryCode {
  value: string;
  flag: string;
  label: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { value: "+91", flag: "🇮🇳", label: "India" },
  { value: "+971", flag: "🇦🇪", label: "UAE" },
  { value: "+966", flag: "🇸🇦", label: "Saudi Arabia" },
  { value: "+974", flag: "🇶🇦", label: "Qatar" },
  { value: "+968", flag: "🇴🇲", label: "Oman" },
  { value: "+965", flag: "🇰🇼", label: "Kuwait" },
  { value: "+973", flag: "🇧🇭", label: "Bahrain" },
  { value: "+1", flag: "🇺🇸", label: "US / Canada" },
  { value: "+44", flag: "🇬🇧", label: "UK" },
  { value: "+61", flag: "🇦🇺", label: "Australia" },
  { value: "+65", flag: "🇸🇬", label: "Singapore" },
  { value: "+60", flag: "🇲🇾", label: "Malaysia" },
  { value: "+62", flag: "🇮🇩", label: "Indonesia" },
  { value: "+66", flag: "🇹🇭", label: "Thailand" },
  { value: "+84", flag: "🇻🇳", label: "Vietnam" },
  { value: "+63", flag: "🇵🇭", label: "Philippines" },
  { value: "+86", flag: "🇨🇳", label: "China" },
  { value: "+852", flag: "🇭🇰", label: "Hong Kong" },
  { value: "+81", flag: "🇯🇵", label: "Japan" },
  { value: "+82", flag: "🇰🇷", label: "South Korea" },
  { value: "+880", flag: "🇧🇩", label: "Bangladesh" },
  { value: "+94", flag: "🇱🇰", label: "Sri Lanka" },
  { value: "+977", flag: "🇳🇵", label: "Nepal" },
  { value: "+92", flag: "🇵🇰", label: "Pakistan" },
  { value: "+49", flag: "🇩🇪", label: "Germany" },
  { value: "+33", flag: "🇫🇷", label: "France" },
  { value: "+39", flag: "🇮🇹", label: "Italy" },
  { value: "+34", flag: "🇪🇸", label: "Spain" },
  { value: "+31", flag: "🇳🇱", label: "Netherlands" },
  { value: "+32", flag: "🇧🇪", label: "Belgium" },
  { value: "+48", flag: "🇵🇱", label: "Poland" },
  { value: "+90", flag: "🇹🇷", label: "Turkey" },
  { value: "+7", flag: "🇷🇺", label: "Russia" },
  { value: "+20", flag: "🇪🇬", label: "Egypt" },
  { value: "+27", flag: "🇿🇦", label: "South Africa" },
  { value: "+234", flag: "🇳🇬", label: "Nigeria" },
  { value: "+254", flag: "🇰🇪", label: "Kenya" },
  { value: "+255", flag: "🇹🇿", label: "Tanzania" },
  { value: "+233", flag: "🇬🇭", label: "Ghana" },
  { value: "+251", flag: "🇪🇹", label: "Ethiopia" },
  { value: "+55", flag: "🇧🇷", label: "Brazil" },
  { value: "+52", flag: "🇲🇽", label: "Mexico" },
];
