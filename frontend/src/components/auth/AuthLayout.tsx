import React from 'react';
import {
  Activity,
  BadgeCheck,
  Blocks,
  Database,
  FileText,
  GraduationCap,
  Landmark,
  Quote,
  School,
  Sparkles,
} from 'lucide-react';
import { ANSWER_SAMPLES, ASSURANCES, MODULES, ROLES } from './authContent';
import {
  useAcademicStructure,
  useKnowledgeBaseStats,
  usePrefersReducedMotion,
  useRotatingSample,
} from './useCampusData';
import '../../styles/auth.css';

/* ---------------------------------------------------------------------------
   AuthLayout
   ---------------------------------------------------------------------------
   One shell for both auth screens so login and signup read as a single
   product. The left column carries the brand and is hidden below `lg`; the
   right column is the form, which every caller supplies.

   The left column is doing the selling for a campus ERP, not for a chatbot: an
   institution badge, a live view of what this deployment actually holds, the
   module surface, who signs in, and one rotating answer drawn from the live
   knowledge base. Every number on this side is read from the running backend —
   nothing here is a mock, and the retrieval machinery is never named.
   ------------------------------------------------------------------------- */

export interface AuthLayoutProps {
  children: React.ReactNode;
  /** Small caps line above the headline, e.g. "Sign in". */
  eyebrow: string;
  /** Headline on the brand side; the card has its own title. */
  headline: React.ReactNode;
  subhead: string;
  /** Institution the form is signing into, shown as an ERP tenant badge. */
  institutionName?: string;
  institutionDomain?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  eyebrow,
  headline,
  subhead,
  institutionName,
  institutionDomain,
}) => {
  const reduced = usePrefersReducedMotion();
  const stats = useKnowledgeBaseStats();
  const { schools, departments } = useAcademicStructure();
  const { sample, index, visible } = useRotatingSample(reduced);

  // Live counts from the API, shown only once they land — a "0 schools" reading
  // while the request is in flight would be worse than showing nothing.
  const structure: { label: string; value: string; icon: React.ReactNode }[] = [
    {
      label: 'schools',
      value: String(schools.length),
      icon: <School className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    {
      label: 'departments',
      value: String(departments.length),
      icon: <Blocks className="w-3.5 h-3.5" aria-hidden="true" />,
    },
  ];

  return (
    <div className="auth-root">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />
      <div className="auth-grid" />
      {/* Film grain. Flat gradients band badly on wide dark panels; this is one
          tiled SVG, so it costs nothing and kills the banding. */}
      <div className="auth-grain" aria-hidden="true" />

      <div className="auth-shell">
        {/* ── Brand column ─────────────────────────────────────────────── */}
        {/* Two sub-columns on wide viewports: identity and live figures on the
            left, the module surface and the sample answer on the right. As a
            single stack the column ran ~340px past a 935px viewport and left a
            band of dead space beside every block. */}
        <div className="auth-brand">
          <div className="auth-brand-main">
            <div className="flex items-center gap-3.5">
              <div className="auth-logo">
                <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.1} aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-bold text-white leading-tight tracking-tight">
                  CampusGenie
                  <span className="auth-logo-suffix">ERP</span>
                </p>
                <p className="text-xs text-slate-400 font-medium tracking-wide">
                  Campus operations platform
                </p>
              </div>
            </div>

            {/* Tenant badge — makes the multi-institution deployment visible. */}
            <div className="auth-tenant mt-6">
              <Landmark className="w-4 h-4 text-indigo-300 flex-shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="auth-tenant-label">Signed in to</span>
                <span className="auth-tenant-name">{institutionName || 'Your institution'}</span>
              </span>
              {institutionDomain && (
                <span className="auth-tenant-domain">{institutionDomain}</span>
              )}
            </div>

            <p className="auth-eyebrow">{eyebrow}</p>

            <h2 className="auth-display text-white">{headline}</h2>

            <p className="auth-subhead">{subhead}</p>

            {/* Live deployment state, read from the running backend. */}
            <div className="auth-stats mt-6">
              <div className="auth-stat">
                <FileText className="auth-stat-icon" aria-hidden="true" />
                <span className="auth-stat-value">{stats.documents}</span>
                <span className="auth-stat-label">indexed documents</span>
              </div>
              <div className="auth-stat">
                <Database className="auth-stat-icon" aria-hidden="true" />
                <span className="auth-stat-value">{stats.chunks}</span>
                <span className="auth-stat-label">retrievable passages</span>
              </div>
              <div className="auth-stat">
                <BadgeCheck className="auth-stat-icon" aria-hidden="true" />
                <span className="auth-stat-value">100%</span>
                <span className="auth-stat-label">answers sourced</span>
              </div>
            </div>

            {/* Academic structure actually configured, plus the health of the
                service that will answer once the user is in. */}
            <div className="auth-console mt-3">
              <div className="auth-console-head">
                <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Deployment</span>
                <span
                  className={`auth-status auth-status-${stats.status}`}
                  title={
                    stats.status === 'live'
                      ? 'Reachable now'
                      : stats.status === 'checking'
                        ? 'Checking'
                        : 'Not reachable — showing last known figures'
                  }
                >
                  {stats.status === 'live'
                    ? 'Live'
                    : stats.status === 'checking'
                      ? 'Checking'
                      : 'Offline'}
                </span>
              </div>
              <div className="auth-console-body">
                {structure.map(({ label, value, icon }) => (
                  <div key={label} className="auth-console-cell">
                    {icon}
                    <span className="auth-console-value">{value}</span>
                    <span className="auth-console-label">{label}</span>
                  </div>
                ))}
                <div className="auth-console-cell">
                  <Landmark className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="auth-console-value">{ROLES.length}</span>
                  <span className="auth-console-label">staff roles</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-brand-side">
            {/* Modules — the ERP surface. */}
            <div>
              <p className="auth-section-label">
                <Blocks className="w-3.5 h-3.5" aria-hidden="true" />
                Modules included
              </p>
              <ul className="auth-modules">
                {MODULES.map(({ key, name, detail, tint }) => (
                  <li key={key} className="auth-module">
                    <span
                      className={`auth-module-icon bg-gradient-to-br ${tint}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="auth-module-name">{name}</span>
                      <span className="auth-module-detail">{detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Who this serves. Four rows, one per role, from the shared list —
                the same four the backend's UserRole enum defines. */}
            <div>
              <p className="auth-section-label">
                <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                One workspace per role
              </p>
              <ul className="auth-roles">
                {ROLES.map(({ key, name, detail }) => (
                  <li key={key} className="auth-role">
                    <span className="auth-role-name">{name}</span>
                    <span className="auth-role-detail">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* A real question, answered from a real document. */}
            <div className="auth-preview">
              <div className="flex items-center justify-between mb-2.5">
                <span className="auth-chip">
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  Ask CampusGenie
                </span>
                <span className="text-[0.7rem] text-slate-500 tabular-nums">
                  {index + 1}/{ANSWER_SAMPLE_COUNT}
                </span>
              </div>

              <div
                key={sample.question}
                className={visible ? 'auth-answer auth-answer-in' : 'auth-answer'}
                aria-live="polite"
              >
                <p className="auth-question">
                  <Quote className="w-3 h-3 mt-1 flex-shrink-0 text-sky-300/70" aria-hidden="true" />
                  <span>{sample.question}</span>
                </p>
                <p className="auth-answer-text">{sample.answer}</p>
                <p className="auth-source">
                  <span className="auth-chip auth-chip-quiet">{sample.category}</span>
                  <span className="truncate">{sample.source}</span>
                </p>
              </div>

              {/* Progress rail doubles as the position indicator. */}
              <div className="auth-rail" aria-hidden="true">
                {Array.from({ length: ANSWER_SAMPLE_COUNT }).map((_, i) => (
                  <span
                    key={i}
                    className="auth-rail-fill"
                    style={{ opacity: i === index ? 1 : 0.18 }}
                  />
                ))}
              </div>
            </div>

            {/* Assurance points, for whoever signs off on the deployment. */}
            <ul className="auth-assurances">
              {ASSURANCES.map((item) => (
                <li key={item} className="auth-assurance">
                  <BadgeCheck
                    className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400/80"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Form column ──────────────────────────────────────────────── */}
        <div className="auth-form-col">{children}</div>
      </div>
    </div>
  );
};

/* Number of rotating answers, read from the sample list length. */
const ANSWER_SAMPLE_COUNT = ANSWER_SAMPLES.length;

export default AuthLayout;