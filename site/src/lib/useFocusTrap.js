import { useEffect, useRef } from 'react';

/**
 * Custom hook to trap focus within a container (e.g. modal / drawer).
 * Also listens for the Escape key to invoke the onClose callback.
 *
 * @param {boolean} isOpen  Whether the modal is currently open.
 * @param {function} onClose Callback invoked when user presses Escape.
 * @returns {React.RefObject} Ref to attach to the modal container element.
 */
export function useFocusTrap(isOpen, onClose) {
  const containerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Hold the latest callback in a ref so the trap effect below depends only on
  // `isOpen`. Callers routinely pass an inline arrow (`onClose={() => ...}`),
  // and depending on it directly would tear down and re-arm the trap on every
  // parent render — stealing focus back to the first element on each keystroke.
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const element = containerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Store previously focused element to restore upon close
    const previousFocus = document.activeElement;

    // Focus the first focusable child or the container itself
    const focusables = Array.from(element.querySelectorAll(focusableSelector));
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      element.setAttribute('tabindex', '-1');
      element.focus();
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab') {
        const currentFocusables = Array.from(element.querySelectorAll(focusableSelector));
        if (currentFocusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = currentFocusables[0];
        const last = currentFocusables[currentFocusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
    };
  }, [isOpen]);

  return containerRef;
}
