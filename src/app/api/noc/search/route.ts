import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Service role not configured");
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Groq keyword extraction
// ---------------------------------------------------------------------------

async function extractKeywords(
  titleQuery: string | null,
  duties: string | null,
): Promise<{ title: string | null; duties: string | null }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { title: titleQuery, duties };

  const inputParts: string[] = [];
  if (titleQuery) inputParts.push(`Job title: ${titleQuery}`);
  if (duties) inputParts.push(`Job description:\n${duties}`);
  if (inputParts.length === 0) return { title: titleQuery, duties };

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `You are a Canadian immigration NOC (National Occupation Classification 2021) expert. Given a job title and/or description, identify the core occupation.

Return a simplified occupation title (2-4 words) matching how NOC names occupations. Be very specific. Remove seniority, company-specific terms, and buzzwords.

Also return 5-8 SPECIFIC duty verbs+nouns that distinguish THIS occupation from others. Focus on what makes it unique, not generic words like "plan", "manage", "report", "analyze" which appear in every occupation.

Respond ONLY in this exact JSON format:
{"title":"simplified title","keywords":"specific keyword1 keyword2 keyword3 ..."}`,
          },
          { role: "user", content: inputParts.join("\n\n") },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[noc/search] Groq error:", res.status);
      return { title: titleQuery, duties };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { title: titleQuery, duties };

    const parsed = JSON.parse(content);
    return {
      title: parsed.title || titleQuery,
      duties: parsed.keywords || duties,
    };
  } catch (err) {
    console.error("[noc/search] Groq extraction failed:", err);
    return { title: titleQuery, duties };
  }
}

// ---------------------------------------------------------------------------
// SOWP eligibility computation
// ---------------------------------------------------------------------------

type SowpStatus = "eligible" | "not_eligible_standard";

interface SowpResult {
  status: SowpStatus;
  basis: string;
  listed: boolean | null;
  conditions: string[];
  alternatives: string[];
}

const SOWP_CONDITIONS: string[] = [
  "The principal worker must have at least 16 months of work authorization remaining when the spouse applies (except spouses of foreign-trained medical professionals recruited by Quebec).",
  "Eligibility is assessed on the worker's actual duties, not the job title.",
  "Work permits issued before January 21, 2025, and their eligible renewals, are grandfathered under the previous rules.",
];

const SOWP_ALTERNATIVES: string[] = [
  "A spouse may still qualify through a permanent residence pathway, such as a bridging open work permit or sponsored spouse during PR processing.",
  "Free trade agreement work permit holders (CUSMA, CETA) may make a spouse eligible regardless of TEER level.",
  "A March 2026 measure for workers under a SIP agreement allows any TEER level with no 16-month requirement.",
  "A June 2026 measure for Quebec PSTQ applicants may also apply.",
  "A consultation can confirm the strongest route for your situation.",
];

function computeSowp(teer: number, sowpListed: boolean): SowpResult {
  if (teer === 0) {
    return {
      status: "eligible",
      basis: "TEER 0 management occupation",
      listed: null,
      conditions: SOWP_CONDITIONS,
      alternatives: [],
    };
  }

  if (teer === 1) {
    return {
      status: "eligible",
      basis: "TEER 1 occupation that usually requires a university degree",
      listed: null,
      conditions: SOWP_CONDITIONS,
      alternatives: [],
    };
  }

  if ((teer === 2 || teer === 3) && sowpListed) {
    return {
      status: "eligible",
      basis: "Listed TEER 2 or 3 shortage occupation",
      listed: true,
      conditions: SOWP_CONDITIONS,
      alternatives: [],
    };
  }

  if (teer === 2 || teer === 3) {
    return {
      status: "not_eligible_standard",
      basis: "TEER 2 or 3 occupation not on the eligible list",
      listed: false,
      conditions: [],
      alternatives: SOWP_ALTERNATIVES,
    };
  }

  return {
    status: "not_eligible_standard",
    basis: "TEER 4 or 5 occupation",
    listed: null,
    conditions: [],
    alternatives: SOWP_ALTERNATIVES,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: { titleQuery?: string; duties?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const rawTitle = body.titleQuery?.trim() || null;
  const rawDuties = body.duties?.trim() || null;

  if (!rawTitle && !rawDuties) {
    return NextResponse.json({ results: [], sowpLastVerified: null });
  }

  const { title: titleQuery, duties } = await extractKeywords(rawTitle, rawDuties);

  const supabase = adminClient();

  // Fetch search results and SOWP version in parallel
  const [searchRes, versionRes] = await Promise.all([
    supabase.rpc("search_noc", {
      p_title_query: titleQuery,
      p_duties: duties,
      p_limit: 10,
    }),
    supabase
      .schema("ref")
      .from("sowp_list_version")
      .select("last_verified")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (searchRes.error) {
    console.error("[api/noc/search] RPC error:", searchRes.error.message);
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }

  const sowpLastVerified = versionRes.data?.last_verified ?? null;

  const rows = (searchRes.data ?? []) as Record<string, unknown>[];
  const results = rows
    .map((r) => ({
      code: r.code as string,
      title: r.title as string,
      teer: r.teer as number,
      broadCategory: r.broad_category as string,
      leadStatement: r.lead_statement as string,
      mainDuties: r.main_duties as string[],
      employmentRequirements: r.employment_requirements as string,
      exampleTitles: r.example_titles as string[],
      exclusions: r.exclusions as string[],
      matchScore: Math.round(r.match_score as number),
      sowpListed: r.sowp_listed as boolean,
      sowp: computeSowp(r.teer as number, r.sowp_listed as boolean),
    }))
    .filter((r) => r.matchScore >= 95);

  return NextResponse.json({ results, sowpLastVerified });
}
