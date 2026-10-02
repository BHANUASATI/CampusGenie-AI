/* ============================================================================
   Content for the auth screens
   ----------------------------------------------------------------------------
   CampusGenie ships as a campus ERP, so the auth pages sell an operating system
   for a university rather than a chatbot. Nothing here names the retrieval
   machinery behind the answers — the framing is modules, roles and outcomes,
   which is what an institution administrator is actually buying.

   The `ANSWER_SAMPLES` below are the exception: they are real question/answer
   pairs retrieved from the live knowledge base, each attributed to the document
   it came from. They are the one thing worth showing verbatim.
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

/* ── Real answers, retrieved from the live knowledge base ───────────────── */

export interface AnswerSample {
  question: string;
  answer: string;
  /** Filename of the document this was retrieved from. */
  source: string;
  /** Short label for the module it belongs to. */
  category: string;
}

export const ANSWER_SAMPLES: AnswerSample[] = [
  {
    question: "What's the minimum attendance requirement?",
    answer:
      '45% for applicable courses, with 80% as the normal academic target. Below 45% is a critical shortage.',
    source: 'KRMU_Attendance_Policy_RAG_Knowledge_Base_v3.docx',
    category: 'Attendance',
  },
  {
    question: 'Last date to pay the semester fee without a late fee?',
    answer:
      '10 October 2026. The window opens 22 September; a late fee applies 11–17 October 2026.',
    source: 'KRMU_Semester_Fee_Submission_Notice_2026_27.docx',
    category: 'Finance',
  },
  {
    question: "My attendance dropped below 45%. What do I do?",
    answer:
      'Report to the programme coordinator within 3 working days of the notice, or academic restrictions may apply.',
    source: 'KRMU_Attendance_Policy_RAG_Knowledge_Base_v3.docx',
    category: 'Attendance',
  },
  {
    question: 'What is in my MCA Semester III timetable?',
    answer:
      'AI & Machine Learning (C-305), Cloud Computing (C-302), Web Engineering with Django (LAB-4), Advanced DBMS.',
    source: 'KRMU_Master_Timetable_RAG_Test_v2.docx',
    category: 'Academics',
  },
  {
    question: 'When is EDM Fest 2026?',
    answer:
      'Saturday, 26 September 2026, on campus — DJ night and live performances alongside the opening ceremony.',
    source: 'KR_Mangalam_University_EDM_Fest_2026_Event_Document.docx',
    category: 'Records',
  },
  {
    question: 'What are the hostel mess rules?',
    answer:
      'Meals follow timings posted by the Hostel Administration. Use your own token or counting mechanism, and complaints go through the hostel channel.',
    source: 'KRMU_Hostel_Residential_Life_Policy_RAG_v1.docx',
    category: 'Records',
  },
];

/* ── Assurance points, in the language of a procurement review ──────────── */

export const ASSURANCES = [
  'Institution-managed access',
  'Every answer cites its source document',
  'Works across departments and campuses',
] as const;

/* ── Fallback knowledge-base size, until /api/ai/health answers ─────────── */

export const FALLBACK_STATS = {
  documents: 7,
  chunks: 363,
} as const;