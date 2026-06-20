import { requireSuperAdminSession } from "@/features/super-admin/lib/super-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type UniversityLocationResult = {
  id: string;
  name: string;
  address: string;
  country: string | null;
  latitude: number;
  longitude: number;
  source: "OPENSTREETMAP" | "OPENAI_WEB";
};

type NominatimResult = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  address?: {
    country?: string;
    city?: string;
    town?: string;
    state?: string;
    region?: string;
  };
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

function numberFrom(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);

  return Number.isFinite(number) ? number : null;
}

function textFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractOpenAIText(payload: OpenAIResponse) {
  if (payload.output_text) return payload.output_text;

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .find((text): text is string => Boolean(text)) ?? null
  );
}

function normalizeNominatimResult(
  result: NominatimResult,
): UniversityLocationResult | null {
  const latitude = numberFrom(result.lat);
  const longitude = numberFrom(result.lon);
  const address = textFrom(result.display_name);

  if (latitude === null || longitude === null || !address) return null;

  return {
    id: `osm:${result.osm_type ?? "place"}:${result.osm_id ?? result.place_id ?? address}`,
    name: textFrom(result.name) ?? address.split(",")[0],
    address,
    country: textFrom(result.address?.country),
    latitude,
    longitude,
    source: "OPENSTREETMAP",
  };
}

async function searchOpenStreetMap(
  query: string,
  country?: string | null,
  region?: string | null,
) {
  const params = new URLSearchParams({
    q: [query, region, country].filter(Boolean).join(", "),
    format: "jsonv2",
    addressdetails: "1",
    limit: "8",
    dedupe: "1",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "CampusHub/1.0 university-location-search",
      },
      next: { revalidate: 60 * 60 * 24 },
    },
  );

  if (!response.ok) return [];

  const payload = (await response.json()) as NominatimResult[];

  return payload
    .map(normalizeNominatimResult)
    .filter((result): result is UniversityLocationResult => Boolean(result));
}

async function searchOpenAIWeb(
  query: string,
  country?: string | null,
  region?: string | null,
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return [];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_LOCATION_MODEL ?? "gpt-4.1-mini",
      tools: [{ type: "web_search_preview" }],
      input: [
        {
          role: "system",
          content:
            "Find the official location coordinates for a university. Return only JSON that matches the schema.",
        },
        {
          role: "user",
          content: `University search: ${query}${region ? ` in ${region}` : ""}${country ? `, ${country}` : ""}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "university_locations",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              results: {
                type: "array",
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    address: { type: "string" },
                    country: { type: ["string", "null"] },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                  },
                  required: [
                    "name",
                    "address",
                    "country",
                    "latitude",
                    "longitude",
                  ],
                },
              },
            },
            required: ["results"],
          },
        },
      },
    }),
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as OpenAIResponse;
  const text = extractOpenAIText(payload);

  if (!text) return [];

  try {
    const parsed = JSON.parse(text) as {
      results?: Array<Record<string, unknown>>;
    };

    return (parsed.results ?? [])
      .map((result, index) => {
        const latitude = numberFrom(result.latitude);
        const longitude = numberFrom(result.longitude);
        const name = textFrom(result.name);
        const address = textFrom(result.address);

        if (latitude === null || longitude === null || !name || !address) {
          return null;
        }

        return {
          id: `openai:${index}:${name}`,
          name,
          address,
          country: textFrom(result.country),
          latitude,
          longitude,
          source: "OPENAI_WEB" as const,
        };
      })
      .filter(
        (result): result is UniversityLocationResult & { source: "OPENAI_WEB" } =>
          Boolean(result),
      );
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    await requireSuperAdminSession();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const country = searchParams.get("country")?.trim() ?? null;
    const region = searchParams.get("region")?.trim() ?? null;

    if (query.length < 2) {
      return apiSuccess({ results: [] });
    }

    const osmResults = await searchOpenStreetMap(query, country, region);
    const results = osmResults.length
      ? osmResults
      : await searchOpenAIWeb(query, country, region);

    return apiSuccess({ results });
  } catch (error) {
    return apiFailure(error);
  }
}
