import React, { useMemo, useRef, useState } from 'react';
import { Check, Dices, Eye, EyeOff, Lock, TriangleAlert, X } from 'lucide-react';
import { PASSWORD_RULES } from './authContent';
import { useCapsLock } from './useAuthUi';
import '../../styles/auth.css';

/* ---------------------------------------------------------------------------
   PasswordField
   ---------------------------------------------------------------------------
   One implementation shared by signup and the reset dialog, because the three
   things that matter on a password field are easy to get subtly wrong and
   tedious to repeat: Caps Lock detection, a visible requirements checklist, and
   a generator that uses a CSPRNG.
   ------------------------------------------------------------------------- */

const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';

/**
 * A password from `crypto.getRandomValues`, with rejection sampling so every
 * character class is uniform. `% length` on a raw byte would bias the first
 * `256 % n` characters, which is irrelevant for a throwaway credential but
 * wrong for no reason.
 */
const generatePassword = (length = 16) => {
  const alphabet = LOWER + UPPER + DIGITS + SYMBOLS;
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);

  const at = (source: string, index: number) => {
    const limit = Math.floor(0xffffffff / source.length) * source.length;
    let value = buf[index];
    while (value >= limit) value = crypto.getRandomValues(new Uint32Array(1))[0];
    return source[value % source.length];
  };

  // One from each class, so the result always satisfies the requirements.
  const chars = [at(LOWER, 0), at(UPPER, 1), at(DIGITS, 2), at(SYMBOLS, 3)];
  for (let i = 4; i < length; i++) chars.push(at(alphabet, i));
  return chars.join('');
};

export interface PasswordFieldProps {
  id: string;
  name: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  /** Renders the live requirements checklist under the field. */
  showRequirements?: boolean;
  /** Renders the generate button. */
  allowGenerate?: boolean;
  /** Extra non-interactive control beside the buttons, e.g. a match tick. */
  trailingSlot?: React.ReactNode;
  error?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  name,
  label = 'Password',
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  showRequirements = false,
  allowGenerate = true,
  trailingSlot,
  error,
  onKeyDown,
}) => {
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);
  const capsLockOn = useCapsLock();
  const inputRef = useRef<HTMLInputElement>(null);

  const checks = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        met: rule.test(value),
      })),
    [value]
  );
  const unmet = checks.filter((c) => !c.met).length;

  // How many controls sit over the right edge of the input. Drives the
  // padding so the text never runs underneath them.
  const actionCount = (allowGenerate ? 1 : 0) + 1 + (trailingSlot ? 1 : 0);

  return (
    <div>
      {label && (
        <label htmlFor={id} className="auth-label">
          {label}
        </label>
      )}

      <div className="relative">
        <Lock className="auth-field-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={revealed ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`auth-field auth-field-actions-${actionCount} ${
            error ? 'auth-field-error' : ''
          }`}
          placeholder={placeholder}
        />

        <div className="auth-field-actions">
          {trailingSlot && <span className="auth-field-match">{trailingSlot}</span>}

          {allowGenerate && (
            <button
              type="button"
              onClick={() => {
                onChange(generatePassword());
                // Reveal what was just generated — a generated password the user
                // cannot see is useless, since they have to retype it.
                setRevealed(true);
                inputRef.current?.focus();
              }}
              className="auth-icon-btn"
              aria-label="Generate a strong password"
              title="Generate a strong password"
            >
              <Dices className="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setRevealed((r) => !r);
              // Keep the caret where it was; toggling would otherwise dump the
              // user back at the start of the field mid-edit.
              inputRef.current?.focus();
            }}
            className="auth-icon-btn"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            title={revealed ? 'Hide password' : 'Show password'}
          >
            {revealed ? (
              <EyeOff className="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />
            ) : (
              <Eye className="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Caps Lock: shown only when the field has focus and the flag is set,
          otherwise it would nag the user while they type their email. */}
      {capsLockOn && focused && (
        <p className="auth-caps" role="status">
          <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>Caps Lock is on</span>
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="auth-hint auth-hint-error" role="alert">
          <X className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {showRequirements && (
        <div className="auth-reqs">
          <div className="auth-reqs-bar" aria-hidden="true">
            <span
              style={{
                width: `${((checks.length - unmet) / checks.length) * 100}%`,
                backgroundColor: strengthColor(checks.length - unmet),
              }}
            />
          </div>
          <ul className="auth-reqs-list">
            {checks.map(({ key, label, met }) => (
              <li
                key={key}
                className={`auth-req ${met ? 'auth-req-met' : ''}`}
                aria-label={`${label}: ${met ? 'met' : 'not met'}`}
              >
                {met ? (
                  <Check className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <span className="auth-req-dot" aria-hidden="true" />
                )}
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const strengthColor = (met: number) => {
  if (met <= 1) return '#f87171';
  if (met === 2) return '#fbbf24';
  if (met === 3) return '#a3e635';
  return '#34d399';
};

export default PasswordField;
