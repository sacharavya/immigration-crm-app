// ---------------------------------------------------------------------------
// Express Entry CRS (Comprehensive Ranking System) scoring engine.
//
// Single source of truth for all point values. The UI must import from
// here and never hardcode or re-derive points. When IRCC updates the
// tables, only this file changes.
//
// Job offer points were removed on March 25 2025 and are intentionally
// excluded.
// ---------------------------------------------------------------------------

export type EducationLevel =
  | "lessThanSecondary"
  | "secondary"
  | "oneYear"
  | "twoYear"
  | "bachelorOrThreeYear"
  | "twoOrMoreCredentials"
  | "masters"
  | "doctoral";

export interface LanguageScores {
  reading: number;
  writing: number;
  speaking: number;
  listening: number;
}

export interface CrsInput {
  hasSpouse: boolean;
  age: number;
  education: EducationLevel;
  firstOfficialLanguage: "english" | "french";
  english?: LanguageScores;
  french?: LanguageScores;
  canadianWorkYears: number;
  foreignWorkYears: number;
  hasTradeCertificate?: boolean;
  spouse?: {
    education: EducationLevel;
    firstLanguage?: LanguageScores;
    canadianWorkYears: number;
  };
  additional?: {
    provincialNomination?: boolean;
    siblingInCanada?: boolean;
    canadianEducation?: "none" | "oneOrTwoYears" | "threeYearsOrMore";
  };
}

export interface CrsBreakdown {
  coreHumanCapital: number;
  spouseFactors: number;
  skillTransferability: number;
  additionalPoints: number;
  total: number;
  detail: Record<string, number>;
}

// ---------------------------------------------------------------------------
// IELTS General → CLB conversion
// ---------------------------------------------------------------------------

type Ability = "reading" | "writing" | "speaking" | "listening";

const IELTS_READING: [number, number][] = [
  [8.0, 10], [7.0, 9], [6.5, 8], [6.0, 7],
  [5.0, 6], [4.0, 5], [3.5, 4],
];

const IELTS_WRITING: [number, number][] = [
  [7.5, 10], [7.0, 9], [6.5, 8], [6.0, 7],
  [5.5, 6], [5.0, 5], [4.0, 4],
];

const IELTS_SPEAKING: [number, number][] = [
  [7.5, 10], [7.0, 9], [6.5, 8], [6.0, 7],
  [5.5, 6], [5.0, 5], [4.0, 4],
];

const IELTS_LISTENING: [number, number][] = [
  [8.5, 10], [8.0, 9], [7.5, 8], [6.0, 7],
  [5.5, 6], [5.0, 5], [4.5, 4],
];

const IELTS_TABLES: Record<Ability, [number, number][]> = {
  reading: IELTS_READING,
  writing: IELTS_WRITING,
  speaking: IELTS_SPEAKING,
  listening: IELTS_LISTENING,
};

export function ieltsToCLB(ability: Ability, band: number): number {
  const table = IELTS_TABLES[ability];
  for (const [threshold, clb] of table) {
    if (band >= threshold) return clb;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// CELPIP General → CLB conversion (direct 1:1 mapping)
// ---------------------------------------------------------------------------

export function celpipToCLB(level: number): number {
  if (level >= 4 && level <= 12) return level;
  return 0;
}

// ---------------------------------------------------------------------------
// Point tables
// ---------------------------------------------------------------------------

// Age points: [single, withSpouse]
const AGE_POINTS: Record<number, [number, number]> = {
  17: [0, 0],
  18: [99, 90],
  19: [105, 95],
  20: [110, 100], 21: [110, 100], 22: [110, 100], 23: [110, 100],
  24: [110, 100], 25: [110, 100], 26: [110, 100], 27: [110, 100],
  28: [110, 100], 29: [110, 100],
  30: [105, 95],
  31: [99, 90],
  32: [94, 85],
  33: [88, 80],
  34: [83, 75],
  35: [77, 70],
  36: [72, 65],
  37: [66, 60],
  38: [61, 55],
  39: [55, 50],
  40: [50, 45],
  41: [39, 35],
  42: [28, 25],
  43: [17, 15],
  44: [6, 5],
};

function agePoints(age: number, hasSpouse: boolean): number {
  const clamped = Math.max(17, Math.min(45, age));
  const entry = AGE_POINTS[clamped];
  if (!entry) return 0; // 45+
  return hasSpouse ? entry[1] : entry[0];
}

// Education points: [single, withSpouse]
const EDUCATION_POINTS: Record<EducationLevel, [number, number]> = {
  lessThanSecondary: [0, 0],
  secondary: [30, 28],
  oneYear: [90, 84],
  twoYear: [98, 91],
  bachelorOrThreeYear: [120, 112],
  twoOrMoreCredentials: [128, 119],
  masters: [135, 126],
  doctoral: [150, 140],
};

function educationPoints(level: EducationLevel, hasSpouse: boolean): number {
  const entry = EDUCATION_POINTS[level];
  return hasSpouse ? entry[1] : entry[0];
}

// First official language points per CLB per ability: [single, withSpouse]
function firstLanguageAbilityPoints(clb: number, hasSpouse: boolean): number {
  if (clb >= 10) return hasSpouse ? 32 : 34;
  if (clb >= 9) return hasSpouse ? 29 : 31;
  if (clb >= 8) return hasSpouse ? 22 : 23;
  if (clb >= 7) return hasSpouse ? 16 : 17;
  if (clb >= 6) return hasSpouse ? 8 : 9;
  if (clb >= 4) return hasSpouse ? 6 : 6;
  return 0;
}

function firstLanguagePoints(
  scores: LanguageScores | undefined,
  hasSpouse: boolean,
): number {
  if (!scores) return 0;
  return (
    firstLanguageAbilityPoints(scores.reading, hasSpouse) +
    firstLanguageAbilityPoints(scores.writing, hasSpouse) +
    firstLanguageAbilityPoints(scores.speaking, hasSpouse) +
    firstLanguageAbilityPoints(scores.listening, hasSpouse)
  );
}

// Second official language points per CLB per ability
function secondLanguageAbilityPoints(clb: number): number {
  if (clb >= 9) return 6;
  if (clb >= 7) return 3;
  if (clb >= 5) return 1;
  return 0;
}

function secondLanguagePoints(scores: LanguageScores | undefined): number {
  if (!scores) return 0;
  const total =
    secondLanguageAbilityPoints(scores.reading) +
    secondLanguageAbilityPoints(scores.writing) +
    secondLanguageAbilityPoints(scores.speaking) +
    secondLanguageAbilityPoints(scores.listening);
  return Math.min(total, 24); // max 24 for second language
}

// Canadian work experience points: [single, withSpouse]
const CANADIAN_WORK_POINTS: Record<number, [number, number]> = {
  0: [0, 0],
  1: [40, 35],
  2: [53, 46],
  3: [64, 56],
  4: [72, 63],
  5: [80, 70],
};

function canadianWorkPoints(years: number, hasSpouse: boolean): number {
  const clamped = Math.min(5, Math.max(0, years));
  const entry = CANADIAN_WORK_POINTS[clamped];
  if (!entry) return 0;
  return hasSpouse ? entry[1] : entry[0];
}

// ---------------------------------------------------------------------------
// Spouse factors
// ---------------------------------------------------------------------------

const SPOUSE_EDUCATION_POINTS: Record<EducationLevel, number> = {
  lessThanSecondary: 0,
  secondary: 2,
  oneYear: 6,
  twoYear: 7,
  bachelorOrThreeYear: 8,
  twoOrMoreCredentials: 9,
  masters: 10,
  doctoral: 10,
};

function spouseLanguageAbilityPoints(clb: number): number {
  if (clb >= 9) return 5;
  if (clb >= 7) return 3;
  if (clb >= 5) return 1;
  return 0;
}

function spouseLanguagePoints(scores: LanguageScores | undefined): number {
  if (!scores) return 0;
  const total =
    spouseLanguageAbilityPoints(scores.reading) +
    spouseLanguageAbilityPoints(scores.writing) +
    spouseLanguageAbilityPoints(scores.speaking) +
    spouseLanguageAbilityPoints(scores.listening);
  return Math.min(total, 20); // max 20
}

const SPOUSE_CANADIAN_WORK_POINTS: Record<number, number> = {
  0: 0, 1: 5, 2: 7, 3: 8, 4: 9, 5: 10,
};

function spouseCanadianWorkPoints(years: number): number {
  return SPOUSE_CANADIAN_WORK_POINTS[Math.min(5, Math.max(0, years))] ?? 0;
}

// ---------------------------------------------------------------------------
// Skill transferability (max 100)
// ---------------------------------------------------------------------------

// Education level categories for transferability
function eduCategory(
  level: EducationLevel,
): "none" | "oneOrTwo" | "threeOrMore" {
  switch (level) {
    case "lessThanSecondary":
    case "secondary":
      return "none";
    case "oneYear":
    case "twoYear":
      return "oneOrTwo";
    default:
      return "threeOrMore";
  }
}

function minCLB(scores: LanguageScores | undefined): number {
  if (!scores) return 0;
  return Math.min(scores.reading, scores.writing, scores.speaking, scores.listening);
}

function skillEducationLanguage(
  education: EducationLevel,
  firstLang: LanguageScores | undefined,
): number {
  const edu = eduCategory(education);
  if (edu === "none") return 0;
  const clb = minCLB(firstLang);
  if (clb < 7) return 0;

  if (edu === "oneOrTwo") {
    return clb >= 9 ? 25 : 13;
  }
  // threeOrMore
  return clb >= 9 ? 50 : 25;
}

function skillEducationCanadianWork(
  education: EducationLevel,
  canadianYears: number,
): number {
  const edu = eduCategory(education);
  if (edu === "none" || canadianYears < 1) return 0;

  if (edu === "oneOrTwo") {
    return canadianYears >= 2 ? 25 : 13;
  }
  return canadianYears >= 2 ? 50 : 25;
}

function skillForeignWorkLanguage(
  foreignYears: number,
  firstLang: LanguageScores | undefined,
): number {
  if (foreignYears < 1) return 0;
  const clb = minCLB(firstLang);
  if (clb < 7) return 0;

  if (foreignYears <= 2) {
    return clb >= 9 ? 25 : 13;
  }
  return clb >= 9 ? 50 : 25;
}

function skillForeignWorkCanadianWork(
  foreignYears: number,
  canadianYears: number,
): number {
  if (foreignYears < 1 || canadianYears < 1) return 0;

  if (foreignYears <= 2) {
    return canadianYears >= 2 ? 25 : 13;
  }
  return canadianYears >= 2 ? 50 : 25;
}

function skillTradeCertLanguage(
  hasTrade: boolean,
  firstLang: LanguageScores | undefined,
): number {
  if (!hasTrade) return 0;
  const clb = minCLB(firstLang);
  if (clb < 5) return 0;
  return clb >= 7 ? 50 : 25;
}

// ---------------------------------------------------------------------------
// Additional points
// ---------------------------------------------------------------------------

function frenchBonus(
  english: LanguageScores | undefined,
  french: LanguageScores | undefined,
): number {
  if (!french) return 0;
  const frMin = minCLB(french);
  if (frMin < 7) return 0;

  // Strong French + strong English
  if (english && minCLB(english) >= 5) return 50;
  // Strong French + no/weak English
  return 25;
}

// ---------------------------------------------------------------------------
// Main calculator
// ---------------------------------------------------------------------------

export function calculateCRS(input: CrsInput): CrsBreakdown {
  const detail: Record<string, number> = {};
  const hs = input.hasSpouse;

  // Determine first and second language scores
  const firstLang =
    input.firstOfficialLanguage === "english" ? input.english : input.french;
  const secondLang =
    input.firstOfficialLanguage === "english" ? input.french : input.english;

  // --- Core human capital ---
  const coreAge = agePoints(input.age, hs);
  const coreEdu = educationPoints(input.education, hs);
  const coreFirst = firstLanguagePoints(firstLang, hs);
  const coreSecond = secondLanguagePoints(secondLang);
  const coreWork = canadianWorkPoints(input.canadianWorkYears, hs);

  detail["core.age"] = coreAge;
  detail["core.education"] = coreEdu;
  detail["core.firstLanguage"] = coreFirst;
  detail["core.secondLanguage"] = coreSecond;
  detail["core.canadianWork"] = coreWork;

  const coreHumanCapital = coreAge + coreEdu + coreFirst + coreSecond + coreWork;

  // --- Spouse factors ---
  let spouseFactors = 0;
  if (hs && input.spouse) {
    const spEdu = SPOUSE_EDUCATION_POINTS[input.spouse.education] ?? 0;
    const spLang = spouseLanguagePoints(input.spouse.firstLanguage);
    const spWork = spouseCanadianWorkPoints(input.spouse.canadianWorkYears);

    detail["spouse.education"] = spEdu;
    detail["spouse.language"] = spLang;
    detail["spouse.canadianWork"] = spWork;

    spouseFactors = spEdu + spLang + spWork;
  }

  // --- Skill transferability (capped at 100) ---
  const stEduLang = skillEducationLanguage(input.education, firstLang);
  const stEduWork = skillEducationCanadianWork(
    input.education,
    input.canadianWorkYears,
  );
  const stForeignLang = skillForeignWorkLanguage(
    input.foreignWorkYears,
    firstLang,
  );
  const stForeignWork = skillForeignWorkCanadianWork(
    input.foreignWorkYears,
    input.canadianWorkYears,
  );
  const stTrade = skillTradeCertLanguage(
    input.hasTradeCertificate ?? false,
    firstLang,
  );

  // Education combination = max(eduLang, eduWork)
  const skillEdu = Math.max(stEduLang, stEduWork);
  // Foreign work combination = max(foreignLang, foreignWork)
  const skillForeign = Math.max(stForeignLang, stForeignWork);
  const skillTrade = stTrade;

  const skillTransferability = Math.min(
    100,
    skillEdu + skillForeign + skillTrade,
  );

  detail["skill.education"] = skillEdu;
  detail["skill.foreignWork"] = skillForeign;
  detail["skill.tradeCertificate"] = skillTrade;

  // --- Additional points ---
  const addPnp = input.additional?.provincialNomination ? 600 : 0;
  const addSibling = input.additional?.siblingInCanada ? 15 : 0;
  const addCanEdu =
    input.additional?.canadianEducation === "threeYearsOrMore"
      ? 30
      : input.additional?.canadianEducation === "oneOrTwoYears"
        ? 15
        : 0;
  const addFrench = frenchBonus(input.english, input.french);

  detail["add.pnp"] = addPnp;
  detail["add.sibling"] = addSibling;
  detail["add.canadianEducation"] = addCanEdu;
  detail["add.french"] = addFrench;

  const additionalPoints = addPnp + addSibling + addCanEdu + addFrench;

  const total =
    coreHumanCapital + spouseFactors + skillTransferability + additionalPoints;

  return {
    coreHumanCapital,
    spouseFactors,
    skillTransferability,
    additionalPoints,
    total,
    detail,
  };
}
