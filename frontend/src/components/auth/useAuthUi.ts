import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Interaction hooks for the auth screens
   ---------------------------------------------------------------------------
   Kept apart from useCampusData.ts, which fetches from the API. These are about
   what the keyboard and the pointer are doing, and each one degrades quietly if
   the browser does not support the underlying API.
   ------------------------------------------------------------------------- */

/**
 * Whether Caps Lock is on, from a key event's modifier state.
 *
 * Worth having on a password field: on a 30-minute token a typo caused by an
 * unnoticed Caps Lock reads as "my password is broken" and sends people to the
 * reset flow. `getModifierState` is supported everywhere we target; the
 * `onKeyEvent` fallback covers Safari's `getModifierState` gap.
 */
export const useCapsLock = () => {
  const [capsLockOn, setCapsLockOn] = useState(false);

  const sync = useCallback((event: KeyboardEvent) => {
    if (typeof event.getModifierState === 'function') {
      setCapsLockOn(event.getModifierState('CapsLock'));
      return;
    }
    // Fallback: Caps Lock is the only modifier that can be on without the
    // physical Shift/Ctrl/Alt keys held, so its absence in the flag set means
    // the user has just switched it off.
    setCapsLockOn(!(event.ctrlKey || event.altKey || event.shiftKey || event.metaKey));
  }, []);

  const onKeyEvent = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'CapsLock') sync(event);
    },
    [sync]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyEvent);
    window.addEventListener('keyup', onKeyEvent);
    return () => {
      window.removeEventListener('keydown', onKeyEvent);
      window.removeEventListener('keyup', onKeyEvent);
    };
  }, [onKeyEvent]);

  return capsLockOn;
};

/**
 * Keep Tab focus inside `active` while it is true, and restore focus to
 * whatever had it when the trap closes.
 *
 * The forgot-password dialog is a modal: without this, Tab walks out of it into
 * the page behind, which is invisible and unusable with a screen reader.
 */
export const useFocusTrap = <T extends HTMLElement>(active: boolean) => {
  const containerRef = useRef<T>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const focusables = () => {
      if (!container) return [] as HTMLElement[];
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    };

    // Move focus to the first real field rather than the close button, which is
    // usually the first focusable child. Opening a "reset your password" dialog
    // should land on an input, not on the way out of it.
    const items = focusables();
    const preferred =
      items.find((el) => el.matches('input:not([type="hidden"]), select, textarea')) ?? items[0];
    preferred?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || !container?.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      restoreRef.current?.focus();
    };
  }, [active]);

  return containerRef;
};

/**
 * Run `handler` when `key` is pressed, unless focus is inside a field the user
 * is typing into. Used for the "/" shortcut that jumps to the email input —
 * the convention in most developer-facing products, and the fastest route from
 * a cold load to a submitted form.
 */
export const useHotkey = (key: string, handler: () => void, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (typing) return;

      event.preventDefault();
      handler();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, handler, enabled]);
};
