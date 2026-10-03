/* ============================================================================
   Content for the auth screens
   ----------------------------------------------------------------------------
   CampusGenie ships as a campus ERP, so the auth pages sell an operating system
   for a university rather than a chatbot. Nothing here names the retrieval
   machinery behind the answers — the framing is modules, roles and outcomes,
   which is what an institution administrator is actually buying.

   The `ANSWER_SAMPLES` below are the exception: they show the shape of a real
   answer — the reply first, the document behind it second — for one module
   each. They are illustrative and name no institution, so the page reads the
   same to every campus rather than to whichever one seeded the knowledge base.
   ========================================================================== */

export interface Institution {
  id: string;
  name: string;
  domain: string;
  email_domain: string;
}

/**
 * Shown before /api/institutions responds, and if it cannot be reached. Kept to
 * one entry so the picker never implies institutions the backend would reject.
 */
export const FALLBACK_INSTITUTIONS: Institution[] = [
  {
    id: 'university.edu.in',
    name: 'Your University',
    domain: 'university.edu.in',
    email_domain: '@university.edu.in',
  },
];

/* ── ERP modules — the product surface, described as departments would ──── */

export interface Module {
  key: string;
  name: string;
  detail: string;
  /** Tailwind gradient classes for the module tile icon. */
  tint: string;
}

export const MODULES: Module[] = [
  {
    key: 'admissions',
    name: 'Admissions',
    detail: 'Applications, enrolment, eligibility',
    tint: 'from-indigo-500 to-violet-600',
  },
  {
    key: 'academics',
    name: 'Academics',
    detail: 'Courses, credits, timetable',
    tint: 'from-sky-500 to-cyan-600',
  },
  {
    key: 'finance',
    name: 'Finance',
    detail: 'Fees, invoices, due dates',
    tint: 'from-emerald-500 to-teal-600',
  },
  {
    key: 'attendance',
    name: 'Attendance',
    detail: 'Registers, shortage, regulations',
    tint: 'from-amber-500 to-orange-600',
  },
  {
    key: 'examinations',
    name: 'Examinations',
    detail: 'Schedules, results, revaluation',
    tint: 'from-rose-500 to-pink-600',
  },
  {
    key: 'records',
    name: 'Records',
    detail: 'Notices, circulars, archives',
    tint: 'from-slate-400 to-slate-600',
  },
];

/* ── Who signs in ───────────────────────────────────────────────────────── */

export interface RoleCard {
  key: string;
  name: string;
  detail: string;
}

export const ROLES: RoleCard[] = [
  { key: 'student', name: 'Students', detail: 'Coursework, fees, results' },
  { key: 'faculty', name: 'Faculty', detail: 'Classes, marks, approvals' },
  { key: 'registrar', name: 'Registrar', detail: 'Enrolment, records, exams' },
  { key: 'admin', name: 'Administration', detail: 'Departments, users, policy' },
];

/* ── Password policy ───────────────────────────────────────────────────── */

/**
 * The rules a new password has to clear, in the order shown. This is the single
 * source of truth: the signup form's live checklist, its bar meter and its
 * submit validation all read these, so they cannot drift apart the way a
 * hand-rolled `scorePassword` plus a hand-written hint string do.
 */
export interface PasswordRule {
  key: string;
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'mixed', label: 'Upper and lower case', test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { key: 'digit', label: 'A number', test: (v) => /\d/.test(v) },
  { key: 'symbol', label: 'A symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** Convenience for callers that need a yes/no on a whole password. */
export const meetsPasswordPolicy = (value: string) =>
  PASSWORD_RULES.every((rule) => rule.test(value));

/* ── Sample answers ─────────────────────────────────────────────────────── */

export interface AnswerSample {
  question: string;
  answer: string;
  /** Document the answer is drawn from, named the way it is cited in-product. */
  source: string;
  /** Short label for the module it belongs to. */
  category: string;
}

/**
 * Illustrative answers, one per module — not retrieved pairs.
 *
 * These used to be real question/answer pairs pulled from the live knowledge
 * base, which made the block honest but also named the deployment it came from:
 * every citation read `KRMU_…docx`, so the page presented itself as a
 * single-campus system no matter how much multi-tenant copy sat above it. An
 * administrator at any other university saw a competitor's handbook and left.
 *
 * So the content is illustrative and institution-neutral, and each one is still
 * written to the shape the real pipeline returns — a direct answer first, then
 * the document behind it. The attribution row stays, because citing the source
 * is the behaviour the page is selling.
 */
export const ANSWER_SAMPLES: AnswerSample[] = [
  {
    question: 'What are the eligibility criteria for the programme I applied to?',
    answer:
      'A bachelor’s degree with at least 50% aggregate, or 45% for reserved-category candidates, from a recognised university.',
    source: 'Admission Guidelines',
    category: 'Admissions',
  },
  {
    question: 'Which courses am I registered for this semester?',
    answer:
      'Cloud Computing (C-302), Web Engineering with Django (LAB-4), Advanced DBMS (C-401) and AI & Machine Learning (C-305).',
    source: 'Semester Timetable',
    category: 'Academics',
  },
  {
    question: 'Last date to pay the semester fee without a late fee?',
    answer:
      '10 October 2026. The window opens 22 September; a late fee applies from 11 to 17 October.',
    source: 'Fee Circular',
    category: 'Finance',
  },
  {
    question: 'What is the minimum attendance for a course?',
    answer:
      '75% overall, and 80% for practicals. Dropping below it raises a shortage notice and a meeting with the programme coordinator.',
    source: 'Academic Regulations',
    category: 'Attendance',
  },
  {
    question: 'How do I apply for revaluation of an answer script?',
    answer:
      'Apply within 7 days of the result declaration and pay the prescribed fee. Revised results are published within 30 working days.',
    source: 'Examination Ordinances',
    category: 'Examinations',
  },
  {
    question: 'When is the annual college festival, and what is on?',
    answer:
      'Saturday 26 September 2026, on campus — opening ceremony in the morning, department competitions through the day, closing concert at night.',
    source: 'Events & Circulars',
    category: 'Records',
  },
];

/* ── Assurance points, in the language of a procurement review ──────────── */

export const ASSURANCES = [
  'Institution-managed access',
  'Every answer cites its source document',
  'Works across departments and campuses',
] as const;

/* ── Proof points, for what a single deployment gives you ────────────────── */

export interface ProofPoint {
  key: string;
  label: string;
  /** Icon to render, resolved to a component by the layout. */
  icon: 'key' | 'mail' | 'enrol';
}

/**
 * Three claims about reach, all of which the product can actually honour.
 *
 * These replaced a row of counters reading `7 indexed documents / 363
 * retrievable passages / 100% answers sourced`, which was the weakest block on
 * the page. "Retrievable passages" named the retrieval machinery out loud —
 * exactly what this file exists to avoid — and the document count came from a
 * hardcoded `FALLBACK_STATS` constant that the health check never replaced, so
 * the one figure a technical evaluator would have checked was the one that
 * could not be true. Neither constant survived the change. None of the three
 * counters said anything about the ERP.
 *
 * Kept separate from `ASSURANCES` on purpose: those are about trust, these are
 * about what one deployment covers.
 */
export const PROOF_POINTS: ProofPoint[] = [
  { key: 'single-signin', label: 'One sign-in across every module', icon: 'key' },
  { key: 'sign-in-methods', label: 'Campus email or Microsoft account', icon: 'mail' },
  {
    key: 'self-enrolment',
    label: 'Self-service enrolment for students and faculty',
    icon: 'enrol',
  },
];