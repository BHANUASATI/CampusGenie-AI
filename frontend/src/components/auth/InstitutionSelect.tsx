import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Search } from 'lucide-react';
import type { Institution } from './authContent';
import '../../styles/auth.css';

/* ---------------------------------------------------------------------------
   InstitutionSelect
   ---------------------------------------------------------------------------
   The picker that makes a multi-tenant deployment legible: which campus is this
   account for. Choosing an institution also fixes the expected email domain, so
   the field below the picker can validate against the right one.

   A custom listbox rather than a native <select> because the list is short and
   the value carries a domain that a native option cannot show well, and because
   the style has to match the rest of the form.

   Implements the ARIA listbox pattern: roving focus, arrow/Home/End keys,
   type-ahead via the filter, Enter/Escape to commit or dismiss.
   ------------------------------------------------------------------------- */

export interface InstitutionSelectProps {
  institutions: Institution[];
  value: Institution | null;
  onChange: (institution: Institution) => void;
  /** Hide the field for flows that already know the tenant. */
  readOnly?: boolean;
  /** Shows a pending state instead of "Select your institution". */
  loading?: boolean;
}

export const InstitutionSelect: React.FC<InstitutionSelectProps> = ({
  institutions,
  value,
  onChange,
  readOnly = false,
  loading = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return institutions;
    return institutions.filter(
      (inst) =>
        inst.name.toLowerCase().includes(needle) || inst.domain.includes(needle)
    );
  }, [institutions, query]);

  // Close on outside click, so the dropdown cannot float over the page.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const commit = (institution: Institution) => {
    onChange(institution);
    setOpen(false);
    setQuery('');
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return;

    if (!open) {
      if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(Math.max(filtered.length - 1, 0));
        break;
      case 'Enter': {
        e.preventDefault();
        const picked = filtered[activeIndex];
        if (picked) commit(picked);
        break;
      }
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setQuery('');
        buttonRef.current?.focus();
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <span className="auth-label" id="institution-label">
        Institution
      </span>

      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls="institution-list"
        aria-labelledby="institution-label"
        aria-haspopup="listbox"
        disabled={readOnly || loading}
        onClick={() => !readOnly && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`auth-field auth-field-plain auth-select-trigger !pr-11 text-left flex items-center gap-2.5 ${
          readOnly ? 'opacity-70 cursor-default' : 'cursor-pointer'
        }`}
      >
        <Building2 className="w-[1.05rem] h-[1.05rem] flex-shrink-0 text-slate-400" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate">
            {loading ? 'Loading institutions…' : value ? value.name : 'Select your institution'}
          </span>
          {value && (
            <span className="block truncate text-xs text-slate-500 font-normal">
              {value.email_domain}
            </span>
          )}
        </span>
        {!readOnly && (
          <ChevronDown
            className={`auth-select-caret ${open ? 'auth-select-caret-open' : ''}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div className="auth-select-pop" role="presentation">
          <div className="auth-select-search">
            <Search className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search institutions"
              aria-label="Search institutions"
              aria-controls="institution-list"
              aria-autocomplete="list"
              className="w-full bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <ul ref={listRef} id="institution-list" role="listbox" className="auth-select-list">
            {filtered.length === 0 && (
              <li className="auth-select-empty">No institution matches that search.</li>
            )}

            {filtered.map((inst, i) => {
              const selected = inst.id === value?.id;
              return (
                <li
                  key={inst.id}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => commit(inst)}
                  className={`auth-select-option ${i === activeIndex ? 'auth-select-option-active' : ''}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-100">
                      {inst.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{inst.domain}</span>
                  </span>
                  {selected && (
                    <Check className="w-4 h-4 flex-shrink-0 text-indigo-300" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InstitutionSelect;