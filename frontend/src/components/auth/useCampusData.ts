import { useEffect, useMemo, useState } from 'react';
import {
  ANSWER_SAMPLES,
  FALLBACK_INSTITUTIONS,
  type AnswerSample,
  type Institution,
} from './authContent';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8002';

/* ---------------------------------------------------------------------------
   Live data for the auth screens
   ---------------------------------------------------------------------------
   Small hooks, each degrading to a known-good fallback so the login page never
   blocks on the network and never renders an empty shell.
   ------------------------------------------------------------------------- */

const getJson = (url: string, signal: AbortSignal) =>
  fetch(url, { signal })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    .catch((err) => {
      // An abort is an unmount, not a failure worth handling.
      if (err?.name === 'AbortError') throw err;
      throw err;
    });

/** Respect the OS "reduce motion" setting, and react if it changes. */
export const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
};

/**
 * Institutions this deployment serves, from the backend. The auth forms use
 * this for the institution picker and the email-domain hint, so the frontend
 * can never suggest a domain the API would reject.
 */
export const useInstitutions = () => {
  // Starts empty on purpose. Seeding with FALLBACK_INSTITUTIONS made the
  // picker show "Your University" with a real-looking domain, and because the
  // fallback shares the default deployment's id, a later list keyed on that id
  // would never replace it — the tenant stayed on placeholder copy forever.
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [multiTenant, setMultiTenant] = useState(false);
  // Drives the picker's own loading state, so an empty list reads as "asking"
  // rather than "this deployment serves nobody".
  const [status, setStatus] = useState<'loading' | 'live' | 'offline'>('loading');

  useEffect(() => {
    const controller = new AbortController();

    getJson(`${API_BASE}/api/institutions`, controller.signal)
      .then((data) => {
        const list = data?.institutions;
        if (!Array.isArray(list) || list.length === 0) {
          setInstitutions(FALLBACK_INSTITUTIONS);
          setStatus('offline');
          return;
        }
        setInstitutions(list as Institution[]);
        setMultiTenant(Boolean(data?.multi_tenant));
        setStatus('live');
      })
      .catch(() => {
        // Unreachable: keep the forms usable with the single placeholder, but
        // say so via `status` rather than passing it off as the real list.
        setInstitutions(FALLBACK_INSTITUTIONS);
        setStatus('offline');
      });

    return () => controller.abort();
  }, []);

  return { institutions, multiTenant, status };
};

/* ── Academic structure ────────────────────────────────────────────────── */

export interface School {
  id: number;
  name: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  school_id: number;
}

/**
 * Schools and departments, for the signup form.
 *
 * Both endpoints are unauthenticated on purpose — they carry no personal data,
 * and a signup form has to render before anyone has signed in. Previously the
 * student path hard-coded `department_id: 1`, which filed every new student
 * under Computer Science regardless of their course.
 */
export const useAcademicStructure = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getJson(`${API_BASE}/schools/`, controller.signal),
      getJson(`${API_BASE}/schools/departments`, controller.signal),
    ])
      .then(([schoolData, departmentData]) => {
        if (Array.isArray(schoolData)) setSchools(schoolData as School[]);
        if (Array.isArray(departmentData)) setDepartments(departmentData as Department[]);
        setLoaded(true);
      })
      .catch(() => {
        // Backend unreachable. `loaded` stays false and the form falls back to
        // a free-text department, so registration still works.
        setLoaded(true);
      });

    return () => controller.abort();
  }, []);

  /** Departments belonging to one school, or all of them when none is chosen. */
  const departmentsFor = useMemo(
    () => (schoolId: number | null) =>
      schoolId === null ? departments : departments.filter((d) => d.school_id === schoolId),
    [departments]
  );

  return { schools, departments, departmentsFor, loaded };
};

/**
 * Cross-fade between real answers. Typing them out would be slow to read and
 * these run long, so the text appears whole and the card animates instead.
 */
export const useRotatingSample = (reduced: boolean, intervalMs = 7000) => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const id = window.setTimeout(() => setVisible(true), 260);
    return () => window.clearTimeout(id);
  }, [index, reduced]);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % ANSWER_SAMPLES.length),
      intervalMs
    );
    return () => window.clearInterval(id);
  }, [reduced, intervalMs]);

  return { sample: ANSWER_SAMPLES[index] as AnswerSample, index, visible };
};