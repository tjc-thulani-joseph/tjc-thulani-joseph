/**
 * Canonical first-party identity data for the public TJC website.
 *
 * Keep this deliberately limited to facts and destinations verified by the
 * site owner. Unconfirmed external profiles must not be added here.
 */
export const TJC_IDENTITY = {
  name: "Thulani Joseph",
  alternateName: "TJC",
  label: "TJC | Thulani Joseph",
  description:
    "TJC (Thulani Joseph) is a South African Emotional Storyteller, Emotional Actor and Emotional Rapper creating music, acting and visual stories inspired by real-life experiences, emotions and personal growth.",
  tagline: "Emotional Storyteller • Emotional Actor • Emotional Rapper",
  url: "/",
  aboutUrl: "/about",
  image:
    "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/86d29adf-9f34-4426-9b34-3731a70f59d3/id-preview-329a0d09--bcb16d77-6efb-45a2-af28-f784c2fedb3b.lovable.app-1785598448805.png",
  // Only verified public profiles belong in this list.
  sameAs: [] as string[],
} as const;

export const TJC_PERSON_ID = "/#person";
export const TJC_PROFILE_ID = "/about#profile";
