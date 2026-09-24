import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { services } from "@/services";
import type { ContentRecord } from "@/types";

type SiteSettings = {
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

const EMPTY_SETTINGS: SiteSettings = {
  siteName: "",
  tagline: "",
  description: "",
  websiteUrl: "",
  contactEmail: "",
  location: "",
  copyright: "",
  logoUrl: "",
  defaultSocialImage: "",
};

const SETTINGS_SLUG = "global";

function readSettings(record: ContentRecord | null): SiteSettings {
  if (!record) {
    return EMPTY_SETTINGS;
  }

  const metadata = record.metadata ?? {};

  return {
    siteName: record.title ?? "",
    tagline: record.category ?? "",
    description: record.description ?? "",
    websiteUrl: record.url ?? "",
    contactEmail: String(metadata.contact_email ?? ""),
    location: String(metadata.location ?? ""),
    copyright: String(metadata.copyright ?? ""),
    logoUrl: String(metadata.logo_url ?? ""),
    defaultSocialImage: String(metadata.default_social_image ?? ""),
  };
}

function isValidUrl(value: string) {
  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function SiteSettingsManager() {
  const queryClient = useQueryClient();

  const repo = useMemo(
    () => services().repository<ContentRecord>("site_configuration"),
    [],
  );

  const [settings, setSettings] = useState<SiteSettings>(EMPTY_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const query = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const result = await repo.list({
        perPage: 20,
        orderBy: "updated_at",
        ascending: false,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data.items.find(
        (item) =>
          item.slug === SETTINGS_SLUG &&
          item.deleted_at === null,
      ) ?? null;
    },
  });

  useEffect(() => {
    if (!query.isPending && !loaded) {
      setSettings(readSettings(query.data ?? null));
      setLoaded(true);
    }
  }, [query.data, query.isPending, loaded]);

  const save = useMutation({
    mutationFn: async (draft: SiteSettings) => {
      if (!draft.siteName.trim()) {
        throw new Error("Site name is required.");
      }

      if (!isValidUrl(draft.websiteUrl)) {
        throw new Error(
          "Website URL must be a valid http:// or https:// address.",
        );
      }

      if (!isValidUrl(draft.logoUrl)) {
        throw new Error(
          "Logo URL must be a valid http:// or https:// address.",
        );
      }

      if (!isValidUrl(draft.defaultSocialImage)) {
        throw new Error(
          "Default social image URL must be a valid http:// or https:// address.",
        );
      }

      if (!isValidEmail(draft.contactEmail)) {
        throw new Error("Contact email is not valid.");
      }

      const existing = query.data ?? null;

      const payload: Partial<ContentRecord> = {
        title: draft.siteName.trim(),
        slug: SETTINGS_SLUG,
        description: draft.description.trim() || null,
        url: draft.websiteUrl.trim() || null,
        category: draft.tagline.trim() || null,

        /*
         * Site configuration is not ordinary public content.
         * We keep the additional global settings in the metadata envelope
         * already used throughout TJC OS.
         */
        metadata: {
          ...(existing?.metadata ?? {}),
          contact_email: draft.contactEmail.trim() || null,
          location: draft.location.trim() || null,
          copyright: draft.copyright.trim() || null,
          logo_url: draft.logoUrl.trim() || null,
          default_social_image:
            draft.defaultSocialImage.trim() || null,
        },

        /*
         * Site configuration is a singleton configuration record.
         * It remains published so the future public data layer can consume it.
         */
        status: "published",
        published_at:
          existing?.published_at ?? new Date().toISOString(),
      };

      const result = await repo.upsertBySlug(
        SETTINGS_SLUG,
        payload,
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data;
    },

    onSuccess: (record) => {
      setSettings(readSettings(record));
      setLoaded(true);

      void queryClient.invalidateQueries({
        queryKey: ["site-settings"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["home"],
      });

      toast.success("Site settings saved", {
        description:
          "The TJC global configuration has been saved.",
      });
    },

    onError: (error: Error) => {
      toast.error("Could not save site settings", {
        description: error.message,
      });
    },
  });

  const updateField = (
    field: keyof SiteSettings,
    value: string,
  ) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">
          System
        </p>

        <h1 className="mt-3 font-display text-3xl font-semibold">
          Site Settings
        </h1>

        <Card className="mt-8 surface-panel border-border">
          <CardContent className="py-10">
            <p className="text-sm text-muted-foreground">
              Loading global site configuration…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">
          System
        </p>

        <h1 className="mt-3 font-display text-3xl font-semibold">
          Site Settings
        </h1>

        <Card className="mt-8 surface-panel border-border">
          <CardContent className="py-10">
            <p className="text-sm text-muted-foreground">
              Could not load site configuration.
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              {query.error instanceof Error
                ? query.error.message
                : "Unknown error"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">
            System
          </p>

          <h1 className="mt-3 font-display text-3xl font-semibold">
            Site Settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Control the global identity and public configuration of
            TJC Digital HQ from one place.
          </p>
        </div>

        <Button
          className="rounded-full"
          onClick={() => save.mutate(settings)}
          disabled={save.isPending}
        >
          <Save className="size-4" aria-hidden />
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="surface-panel border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full border border-border bg-background">
                <Settings2
                  className="size-4 text-gold"
                  aria-hidden
                />
              </div>

              <div>
                <CardTitle className="text-base font-medium">
                  Site Identity
                </CardTitle>

                <p className="mt-1 text-xs text-muted-foreground">
                  The core information that identifies TJC publicly.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <label
                htmlFor="site-name"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Site name
              </label>

              <Input
                id="site-name"
                className="mt-2"
                value={settings.siteName}
                onChange={(event) =>
                  updateField("siteName", event.target.value)
                }
                placeholder="Thulani Joseph"
              />
            </div>

            <div>
              <label
                htmlFor="site-tagline"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Tagline
              </label>

              <Input
                id="site-tagline"
                className="mt-2"
                value={settings.tagline}
                onChange={(event) =>
                  updateField("tagline", event.target.value)
                }
                placeholder="Creative director · Artist · Founder"
              />
            </div>

            <div>
              <label
                htmlFor="site-description"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Site description
              </label>

              <Textarea
                id="site-description"
                className="mt-2 min-h-32"
                value={settings.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="The official digital headquarters of Thulani Joseph."
              />
            </div>

            <div>
              <label
                htmlFor="website-url"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Website URL
              </label>

              <Input
                id="website-url"
                type="url"
                className="mt-2"
                value={settings.websiteUrl}
                onChange={(event) =>
                  updateField("websiteUrl", event.target.value)
                }
                placeholder="https://example.com"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="surface-panel border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Globe2
                  className="size-4 text-gold"
                  aria-hidden
                />

                <div>
                  <CardTitle className="text-base font-medium">
                    Public Details
                  </CardTitle>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Global contact and presentation details.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div>
                <label
                  htmlFor="contact-email"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Contact email
                </label>

                <Input
                  id="contact-email"
                  type="email"
                  className="mt-2"
                  value={settings.contactEmail}
                  onChange={(event) =>
                    updateField(
                      "contactEmail",
                      event.target.value,
                    )
                  }
                  placeholder="hello@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Location
                </label>

                <Input
                  id="location"
                  className="mt-2"
                  value={settings.location}
                  onChange={(event) =>
                    updateField("location", event.target.value)
                  }
                  placeholder="South Africa"
                />
              </div>

              <div>
                <label
                  htmlFor="copyright"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Copyright line
                </label>

                <Input
                  id="copyright"
                  className="mt-2"
                  value={settings.copyright}
                  onChange={(event) =>
                    updateField("copyright", event.target.value)
                  }
                  placeholder="© Thulani Joseph"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Brand Assets
              </CardTitle>

              <p className="text-xs text-muted-foreground">
                URLs for global brand assets. Media Library integration
                can be connected here later.
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              <div>
                <label
                  htmlFor="logo-url"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Logo URL
                </label>

                <Input
                  id="logo-url"
                  type="url"
                  className="mt-2"
                  value={settings.logoUrl}
                  onChange={(event) =>
                    updateField("logoUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>

              <div>
                <label
                  htmlFor="social-image"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Default social image URL
                </label>

                <Input
                  id="social-image"
                  type="url"
                  className="mt-2"
                  value={settings.defaultSocialImage}
                  onChange={(event) =>
                    updateField(
                      "defaultSocialImage",
                      event.target.value,
                    )
                  }
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6 surface-panel border-border">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">
              Configuration status
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {query.data
                ? "Global site configuration is connected to TJC OS."
                : "No global configuration exists yet. Save these settings to create it."}
            </p>
          </div>

          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => save.mutate(settings)}
            disabled={save.isPending}
          >
            <Save className="size-4" aria-hidden />
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
