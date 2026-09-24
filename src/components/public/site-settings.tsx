import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { SITE } from "@/constants/site";
import { services } from "@/services";
import type { ContentRecord } from "@/types";

export type PublicSiteSettings = {
  siteName: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  contactEmail: string;
  location: string;
  copyright: string;
  logoUrl: string;
  defaultSocialImage: string;
};

const FALLBACK_SETTINGS: PublicSiteSettings = {
  siteName: SITE.name,
  tagline: SITE.tagline,
  description: SITE.description,
  websiteUrl: "",
  contactEmail: "",
  location: "",
  copyright: "",
  logoUrl: "",
  defaultSocialImage: "",
};

function readPublicSettings(
  record: ContentRecord | null,
): PublicSiteSettings {
  if (!record) {
    return FALLBACK_SETTINGS;
  }

  const metadata = record.metadata ?? {};

  return {
    siteName: record.title?.trim() || SITE.name,
    tagline: record.category?.trim() || SITE.tagline,
    description: record.description?.trim() || SITE.description,
    websiteUrl: record.url?.trim() || "",
    contactEmail: String(metadata.contact_email ?? "").trim(),
    location: String(metadata.location ?? "").trim(),
    copyright: String(metadata.copyright ?? "").trim(),
    logoUrl: String(metadata.logo_url ?? "").trim(),
    defaultSocialImage: String(
      metadata.default_social_image ?? "",
    ).trim(),
  };
}

/**
 * Public Site Settings data layer.
 *
 * Only the published global configuration record is eligible.
 * Supabase RLS remains the final public security boundary.
 */
export function usePublicSiteSettings() {
  const query = useQuery({
    queryKey: ["public-site-settings"],
    queryFn: async () => {
      const result = await services()
        .repository<ContentRecord>("site_configuration")
        .list({
          status: "published",
          perPage: 20,
          orderBy: "updated_at",
          ascending: false,
        });

      if (result.error) {
        throw new Error(result.error.message);
      }

      const record =
        result.data.items.find(
          (item) =>
            item.slug === "global" &&
            item.deleted_at === null,
        ) ?? null;

      return readPublicSettings(record);
    },
    staleTime: 60_000,
  });

  return {
    settings: query.data ?? FALLBACK_SETTINGS,
    pending: query.isPending,
    error: query.error ?? null,
  };
}

/**
 * Keeps the browser's document metadata synchronized with
 * the same global configuration used by the visible site.
 *
 * Route-level static metadata remains as a safe fallback for
 * the initial document.
 */
export function PublicSiteMetadata() {
  const { settings } = usePublicSiteSettings();

  useEffect(() => {
    const title = `${settings.siteName} — Official Site`;

    document.title = title;

    const setMeta = (
      selector: string,
      attribute: string,
      value: string,
    ) => {
      let element = document.head.querySelector(
        selector,
      ) as HTMLMetaElement | null;

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, "");
        document.head.appendChild(element);
      }

      element.setAttribute(attribute, value);
    };

    setMeta(
      'meta[name="description"]',
      "name",
      settings.description,
    );

    setMeta(
      'meta[name="author"]',
      "name",
      settings.siteName,
    );

    setMeta(
      'meta[property="og:title"]',
      "property",
      title,
    );

    setMeta(
      'meta[property="og:description"]',
      "property",
      settings.description,
    );

    if (settings.defaultSocialImage) {
      setMeta(
        'meta[property="og:image"]',
        "property",
        settings.defaultSocialImage,
      );

      setMeta(
        'meta[name="twitter:image"]',
        "name",
        settings.defaultSocialImage,
      );
    }
  }, [
    settings.siteName,
    settings.description,
    settings.defaultSocialImage,
  ]);

  return null;
}
