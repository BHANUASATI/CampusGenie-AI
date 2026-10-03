import React, { useEffect, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  Blocks,
  GraduationCap,
  KeyRound,
  Landmark,
  Mail,
  Moon,
  Quote,
  Sparkles,
  Sun,
  UserPlus,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ANSWER_SAMPLES, ASSURANCES, MODULES, PROOF_POINTS, ROLES } from './authContent';
import {
  useInstitutions,
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
   module surface, who signs in, and one rotating sample answer. Every figure on
   this side is read from the running backend, and the retrieval machinery is
   never named.
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
  const { sample, index, visible } = useRotatingSample(reduced);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [switching, setSwitching] = useState(false);

  // The auth shell themes itself through `data-auth-theme`, but the page canvas
  // lives on <html> and lives outside the shell. Mirror the value up there so
  // any scrollable overflow past the shell is painted to match, then take it
  // back off on unmount so the rest of the app is unaffected.
  useEffect(() => {
    document.documentElement.dataset.authTheme = theme;
    return () => {
      delete document.documentElement.dataset.authTheme;
    };
  }, [theme]);

  // Suppress transitions for the paint in which the new theme is first
  // resolved. Without it the theme change lands on the text but not the
  // surfaces: a `transition` on `background-color` starts a tween when
  // `--auth-ink` flips and never reaches its end value, so inputs keep the
  // previous theme's background.
  //
  // The ordering that matters is that the browser paints once with transitions
  // off before they come back, and only an animation frame can guarantee that.
  // A timeout backs it up because a backgrounded tab runs no frames at all —
  // otherwise the suppression would stick and kill every hover transition until
  // the tab was focused again.
  const handleThemeToggle = () => {
    setSwitching(true);
    toggleTheme();
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setSwitching(false));
    });
    setTimeout(() => {
      cancelAnimationFrame(frame);
      setSwitching(false);
    }, 150);
  };

  // What this deployment covers, read from the running backend where it can be.
  //
  // Deliberately *not* the academic structure — schools and departments describe
  // one campus, so on a multi-tenant login page they read as a single-university
  // product and contradict the tenant badge above them. Universities is the live
  // accepted-domain count and grows with the operator's configuration; roles and
  // modules are the platform surface, which is the same for every tenant.
  //
  // Held back until the request lands: "0 universities" mid-flight is worse than
  // an empty panel, and unlike the other two it can legitimately be zero.
  const { institutions, status: institutionStatus } = useInstitutions();
  // The directory hook calls its in-flight state `loading`; the status pill
  // styles and copy speak in terms of `checking`.
  const platformStatus =
    institutionStatus === 'loading' ? 'checking' : institutionStatus;
  const footprint: { label: string; value: string; icon: React.ReactNode }[] = [
    {
      label: institutions.length === 1 ? 'university' : 'universities',
      // Em dash rather than "0": the directory can legitimately come back empty,
      // and that is a different message from "still asking".
      value: institutionStatus === 'loading' ? '—' : String(institutions.length),
      icon: <Landmark className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    {
      // "Role types", not "staff roles": the list is one entry per workspace, and
      // Students is one of them.
      label: 'role types',
      value: String(ROLES.length),
      icon: <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />,
    },
    {
      label: 'modules',
      value: String(MODULES.length),
      icon: <Blocks className="w-3.5 h-3.5" aria-hidden="true" />,
    },
  ];

  return (
    <div className="auth-root" data-auth-theme={theme} data-theme-switching={switching || undefined}>
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />
      <div className="auth-grid" />
      {/* Film grain. Flat gradients band badly on wide dark panels; this is one
          tiled SVG, so it costs nothing and kills the banding. */}
      <div className="auth-grain" aria-hidden="true" />

      {/* Theme switch. Sits above everything and follows the shell's edge, so
          it stays reachable no matter how tall the brand column grows. */}
      <button
        type="button"
        onClick={handleThemeToggle}
        className="auth-theme-toggle"
        aria-pressed={isDark}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {isDark ? (
          <Sun className="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />
        ) : (
          <Moon className="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />
        )}
      </button>

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
                <p className="auth-ink-text text-lg font-bold leading-tight tracking-tight">
                  CampusGenie
                  <span className="auth-logo-suffix">ERP</span>
                </p>
                <p className="auth-text-muted text-xs font-medium tracking-wide">
                  Campus operations platform
                </p>
              </div>
            </div>

            {/* Tenant badge — makes the multi-institution deployment visible. */}
            <div className="auth-tenant mt-6">
              <Landmark className="w-4 h-4 auth-accent-soft flex-shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="auth-tenant-label">Signed in to</span>
                <span className="auth-tenant-name">{institutionName || 'Your institution'}</span>
              </span>
              {institutionDomain && (
                <span className="auth-tenant-domain">{institutionDomain}</span>
              )}
            </div>

            <p className="auth-eyebrow">{eyebrow}</p>

            <h2 className="auth-display auth-ink-text">{headline}</h2>

            <p className="auth-subhead">{subhead}</p>

            {/* What one deployment covers, in prose. Deliberately not figures:
                the console directly below already carries the numbers, and two
                numeric panels stacked read as a dashboard bolted onto a
                marketing page. */}
            <ul className="auth-proofs mt-6">
              {PROOF_POINTS.map(({ key, label, icon }) => {
                const Icon = PROOF_ICONS[icon];
                return (
                  <li key={key} className="auth-proof">
                    <span className="auth-proof-icon">
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="auth-proof-label">{label}</span>
                  </li>
                );
              })}
            </ul>

            {/* What this deployment covers, and whether the directory backing
                that count answered. The pill watches the same endpoint the
                number comes from — it used to watch the knowledge-base health
                check, which was the only thing on the page that figure had
                nothing to do with. */}
            <div className="auth-console mt-3">
              <div className="auth-console-head">
                <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Platform</span>
                <span
                  className={`auth-status auth-status-${platformStatus}`}
                  title={
                    platformStatus === 'live'
                      ? 'Reachable now'
                      : platformStatus === 'checking'
                        ? 'Checking'
                        : 'Not reachable — showing the last known figures'
                  }
                >
                  {platformStatus === 'live'
                    ? 'Live'
                    : platformStatus === 'checking'
                      ? 'Checking'
                      : 'Offline'}
                </span>
              </div>
              <div className="auth-console-body">
                {footprint.map(({ label, value, icon }) => (
                  <div key={label} className="auth-console-cell">
                    {icon}
                    <span className="auth-console-value">{value}</span>
                    <span className="auth-console-label">{label}</span>
                  </div>
                ))}
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
                <span className="auth-text-faint text-[0.7rem] tabular-nums">
                  {index + 1}/{ANSWER_SAMPLE_COUNT}
                </span>
              </div>

              <div
                key={sample.question}
                className={visible ? 'auth-answer auth-answer-in' : 'auth-answer'}
                aria-live="polite"
              >
                <p className="auth-question">
                  <Quote className="w-3 h-3 mt-1 flex-shrink-0 auth-accent-sky" aria-hidden="true" />
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
                    className="w-3.5 h-3.5 flex-shrink-0 auth-ok"
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

/** Icon per proof point. Kept here so `authContent` stays presentation-free. */
const PROOF_ICONS = {
  key: KeyRound,
  mail: Mail,
  enrol: UserPlus,
} as const;

export default AuthLayout;