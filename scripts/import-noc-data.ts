/**
 * Import NOC 2021 V1.0 data from Statistics Canada into ref.noc_occupations.
 *
 * Downloads two CSV files:
 *   1. Classification structure — codes, titles, broad categories, definitions
 *   2. Elements — main duties, example titles, employment requirements, exclusions
 *
 * Then upserts all 5-digit unit groups into the Supabase table.
 *
 * Usage:
 *   npx tsx scripts/import-noc-data.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { parse } from "csv-parse/sync";

config({ path: ".env.local" });

const STRUCTURE_URL =
  "https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-classification-structure.csv";
const ELEMENTS_URL =
  "https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv";

// TEER is the second digit of the 5-digit code (for codes starting with
// a broad-category digit). The broad category is the first digit.
const BROAD_CATEGORIES: Record<string, string> = {
  "0": "Legislative and senior management occupations",
  "1": "Business, finance and administration occupations",
  "2": "Natural and applied sciences and related occupations",
  "3": "Health occupations",
  "4": "Occupations in education, law and social, community and government services",
  "5": "Occupations in art, culture, recreation and sport",
  "6": "Sales and service occupations",
  "7": "Trades, transport and equipment operators and related occupations",
  "8": "Natural resources, agriculture and related production occupations",
  "9": "Occupations in manufacturing and utilities",
};

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE env vars in .env.local");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchCsv(url: string): Promise<Record<string, string>[]> {
  console.log(`Downloading ${url.split("/").pop()}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

function teerFromCode(code: string): number {
  // For broad category 0 (management), TEER is 0
  if (code.startsWith("0")) return 0;
  // Otherwise the second digit is the TEER level
  return parseInt(code[1], 10);
}

function broadCategoryFromCode(code: string): string {
  return BROAD_CATEGORIES[code[0]] ?? `Category ${code[0]}`;
}

async function main() {
  console.log("=== NOC 2021 Data Import ===\n");

  // 1. Download both CSVs
  const [structureRows, elementRows] = await Promise.all([
    fetchCsv(STRUCTURE_URL),
    fetchCsv(ELEMENTS_URL),
  ]);

  console.log(`Structure rows: ${structureRows.length}`);
  console.log(`Element rows: ${elementRows.length}`);

  // 2. Parse structure: extract 5-digit unit groups with titles and definitions
  const unitGroups = new Map<
    string,
    {
      code: string;
      title: string;
      teer: number;
      broadCategory: string;
      leadStatement: string;
    }
  >();

  for (const row of structureRows) {
    const level = row["Level"]?.trim();
    const code = row["Code - NOC 2021 V1.0"]?.trim();
    const title = row["Class title"]?.trim();
    const definition = row["Class definition"]?.trim() ?? "";

    if (level === "5" && code && title) {
      unitGroups.set(code, {
        code,
        title,
        teer: teerFromCode(code),
        broadCategory: broadCategoryFromCode(code),
        leadStatement: definition,
      });
    }
  }

  console.log(`Unit groups found: ${unitGroups.size}`);

  // 3. Parse elements: group by code, collect duties, examples, requirements, exclusions
  const elements = new Map<
    string,
    {
      mainDuties: string[];
      exampleTitles: string[];
      employmentRequirements: string[];
      exclusions: string[];
    }
  >();

  // Column names from the CSV
  const codeCol = "Code - NOC 2021 V1.0";
  const typeCol = "Element Type Label English";
  const descCol = "Element Description English";

  for (const row of elementRows) {
    const code = row[codeCol]?.trim();
    const elType = row[typeCol]?.trim();
    const desc = row[descCol]?.trim();

    if (!code || !desc || !unitGroups.has(code)) continue;

    if (!elements.has(code)) {
      elements.set(code, {
        mainDuties: [],
        exampleTitles: [],
        employmentRequirements: [],
        exclusions: [],
      });
    }
    const el = elements.get(code)!;

    if (elType === "Main duties") {
      el.mainDuties.push(desc);
    } else if (
      elType === "All examples" ||
      elType === "Illustrative example(s)"
    ) {
      el.exampleTitles.push(desc);
    } else if (elType === "Employment requirements") {
      el.employmentRequirements.push(desc);
    } else if (elType === "Exclusion(s)") {
      el.exclusions.push(desc);
    }
  }

  console.log(`Elements parsed for ${elements.size} codes`);

  // 4. Build upsert rows
  const rows = Array.from(unitGroups.values()).map((ug) => {
    const el = elements.get(ug.code);
    return {
      code: ug.code,
      title: ug.title,
      teer: ug.teer,
      broad_category: ug.broadCategory,
      lead_statement: ug.leadStatement,
      main_duties: el?.mainDuties ?? [],
      employment_requirements: (el?.employmentRequirements ?? []).join(" "),
      example_titles: el?.exampleTitles ?? [],
      exclusions: el?.exclusions ?? [],
    };
  });

  console.log(`\nUpserting ${rows.length} occupations...`);

  // 5. Upsert in batches of 50
  const db = supabase();
  const BATCH = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await db
      .schema("ref")
      .from("noc_occupations")
      .upsert(batch, { onConflict: "code" });

    if (error) {
      console.error(
        `  Batch ${i / BATCH + 1} failed:`,
        error.message,
      );
      errors += batch.length;
    } else {
      inserted += batch.length;
      process.stdout.write(
        `  ${inserted}/${rows.length} inserted\r`,
      );
    }
  }

  console.log(`\n\nDone! ${inserted} inserted, ${errors} failed.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
