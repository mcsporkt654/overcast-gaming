/**
 * Scroll-triggered reveals, matching the timings in the design handoff.
 *
 * Both actions fire once, on the element's first intersection at a 25%
 * threshold, and both no-op into their finished state when the visitor
 * prefers reduced motion.
 */

const THRESHOLD = 0.25;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Observes `node` and runs `onEnter` the first time it scrolls into view.
 *
 * @param {HTMLElement} node
 * @param {() => void} onEnter
 */
function observeOnce(node, onEnter) {
  if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
    onEnter();
    return { destroy() {} };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        onEnter();
      }
    },
    { threshold: THRESHOLD }
  );
  observer.observe(node);

  return {
    destroy() {
      observer.disconnect();
    }
  };
}

/**
 * Adds a class on first intersection. Used by the standings rows, whose
 * `.show` class drives the bar-fill width transition in CSS.
 *
 * @param {HTMLElement} node
 * @param {string} [className]
 */
export function reveal(node, className = 'show') {
  return observeOnce(node, () => node.classList.add(className));
}

/**
 * Counts from 0 up to the element's rendered value on first intersection —
 * 1400ms, cubic ease-out, per the handoff.
 *
 * The final value is what's server-rendered, so the number is correct before
 * (and without) JavaScript; the animation only rewinds it once the element is
 * on screen and hydration has finished.
 *
 * @param {HTMLElement} node
 * @param {number} target
 */
export function countUp(node, target) {
  const value = Number(target);
  if (!Number.isFinite(value) || value === 0) return { destroy() {} };

  return observeOnce(node, () => {
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = Math.round(value * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}
