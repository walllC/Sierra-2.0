// ================================================================
// utils.js  –  EchoWall / RantBox
//
// PURPOSE:
//   A self-contained utility belt of small, pure helper functions
//   used across the entire front-end (feed.js, storage.js, etc.).
//   Nothing in here talks to the network or the DOM except for
//   showToast() and avatar(), which are explicitly UI helpers.
//
// PATTERN:
//   Wrapped in an IIFE (Immediately Invoked Function Expression) so
//   all internal variables and helpers are private by default.
//   Only the functions listed in the return object are public.
// ================================================================

const Utils = (() => {

  // ══════════════════════════════════════════════════════════
  // ID GENERATION
  // ══════════════════════════════════════════════════════════

  /**
   * Generates a short, unique-enough string ID.
   *
   * HOW IT WORKS:
   *   Combines two base-36 encoded values:
   *     1. Date.now()  – millisecond timestamp, ensures IDs are
   *        chronologically ordered and never collide across time.
   *     2. Math.random() slice – 6 extra random chars to prevent
   *        collisions if two IDs are generated in the same millisecond.
   *
   * The result looks like: "lc3kj8a4f2g1"
   *
   * NOTE: This is NOT cryptographically secure. Use only for
   * client-side ephemeral IDs (e.g. temporary card keys), not for
   * anything security-sensitive.
   *
   * @returns {string} A short alphanumeric ID string.
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }


  // ══════════════════════════════════════════════════════════
  // DATE PARSING
  // ══════════════════════════════════════════════════════════

  /**
   * Safely parses a variety of date inputs into a native Date object.
   *
   * WHY THIS EXISTS:
   *   MySQL DATETIME columns return strings like "2024-06-15 14:30:00"
   *   (with a space separator). The built-in `new Date()` constructor
   *   treats space-separated strings as invalid in some browsers/environments.
   *   This function normalises the space to 'T' to produce a valid ISO 8601
   *   string ("2024-06-15T14:30:00") before parsing.
   *
   * ACCEPTED INPUTS:
   *   • null / undefined / ''       → returns null
   *   • A Date object               → returned as-is (no-op)
   *   • ISO string "2024-06-15T…"   → parsed directly
   *   • MySQL string "2024-06-15 …" → space normalised, then parsed
   *   • Any other string            → parsed by Date constructor;
   *                                   returns null if invalid
   *
   * @param {string|Date|null|undefined} value - The date value to parse.
   * @returns {Date|null} A valid Date object, or null if unparseable.
   */
  function parseDate(value) {
    if (!value) return null;

    // If it's already a Date object, return it unchanged.
    if (value instanceof Date) return value;

    // Normalise MySQL "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DD THH:MM:SS"
    // so that new Date() parses it consistently across all browsers.
    const normalized = String(value).trim().replace(
      /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})$/,
      '$1T$2'
    );

    const date = new Date(normalized);

    // getTime() returns NaN for invalid dates; treat those as null.
    return Number.isNaN(date.getTime()) ? null : date;
  }


  // ══════════════════════════════════════════════════════════
  // RELATIVE TIME
  // ══════════════════════════════════════════════════════════

  /**
   * Converts a date string or value into a human-friendly relative
   * time label, e.g. "Just now", "5m", "3h", "2d", or a locale date.
   *
   * THRESHOLDS:
   *   < 10 seconds  → "Just now"
   *   < 60 seconds  → "Xs"   (e.g. "45s")
   *   < 1 hour      → "Xm"   (e.g. "12m")
   *   < 1 day       → "Xh"   (e.g. "3h")
   *   < 7 days      → "Xd"   (e.g. "5d")
   *   ≥ 7 days      → locale date string (e.g. "6/15/2024")
   *
   * Returns an empty string if the input cannot be parsed, so callers
   * can safely interpolate without extra null-checks.
   *
   * @param {string|Date|null} isoString - The timestamp to format.
   * @returns {string} A short relative time label.
   */
  function timeAgo(isoString) {
    const date = parseDate(isoString);
    if (!date) return '';

    // Difference in whole seconds between now and the given date.
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diff < 10)     return 'Just now';
    if (diff < 60)     return `${diff}s`;
    if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

    // Older than a week: show the actual date in the user's locale.
    return date.toLocaleDateString();
  }


  // ══════════════════════════════════════════════════════════
  // DATE CHECKS
  // ══════════════════════════════════════════════════════════

  /**
   * Returns true if the given date falls on today's calendar date.
   * Compares day, month, and year in local time — does NOT compare
   * clock time, so "today at 00:01" and "today at 23:59" both return true.
   *
   * Used to decide whether to show a "Today" label on the trending
   * section or notification timestamps.
   *
   * @param {string|Date|null} isoString - The date to test.
   * @returns {boolean}
   */
  function isToday(isoString) {
    const d = parseDate(isoString);
    const n = new Date(); // Current local time.
    if (!d) return false;
    return (
      d.getDate()     === n.getDate()     &&
      d.getMonth()    === n.getMonth()    &&
      d.getFullYear() === n.getFullYear()
    );
  }


  // ══════════════════════════════════════════════════════════
  // STRING SANITISATION
  // ══════════════════════════════════════════════════════════

  /**
   * Escapes a plain-text string so it is safe to embed inside HTML.
   *
   * HOW IT WORKS:
   *   Creates a temporary <div> element, sets its textContent
   *   (which the browser auto-escapes), then reads innerHTML back.
   *   This converts characters like < > & " ' into their HTML
   *   entity equivalents, preventing XSS injection when user-supplied
   *   content is placed into the DOM via innerHTML.
   *
   * EXAMPLE:
   *   escapeHtml('<script>alert(1)</script>')
   *   → '&lt;script&gt;alert(1)&lt;/script&gt;'
   *
   * NOTE: Prefer setting element.textContent directly where possible.
   * Use this only when you must concatenate user content into an HTML
   * string (e.g. inside a template literal passed to innerHTML).
   *
   * @param {string} str - Raw user-supplied string.
   * @returns {string} HTML-entity-escaped string, safe for innerHTML.
   */
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;   // Browser escapes the string automatically.
    return d.innerHTML;    // Read back the escaped version.
  }


  // ══════════════════════════════════════════════════════════
  // TOAST NOTIFICATIONS
  // ══════════════════════════════════════════════════════════

  /**
   * Displays a brief, auto-dismissing toast notification at the
   * bottom of the screen.
   *
   * BEHAVIOUR:
   *   • Any existing toast is removed first so messages don't stack.
   *   • The toast fades in via the 'rb-toast--show' CSS class added
   *     inside a requestAnimationFrame (forces a paint cycle so the
   *     CSS transition actually runs after the element is in the DOM).
   *   • After 2800 ms the 'show' class is removed (triggers fade-out).
   *   • 300 ms later (matching the CSS transition duration) the element
   *     is removed from the DOM entirely.
   *
   * TYPES (maps to CSS modifier classes):
   *   'info'    – neutral / default (blue)
   *   'success' – positive feedback (green)
   *   'error'   – failure or warning (red)
   *
   * CSS required: .rb-toast, .rb-toast--show, .rb-toast--info,
   *               .rb-toast--success, .rb-toast--error
   *
   * @param {string} message - Text to display in the toast.
   * @param {string} [type='info'] - Visual style variant.
   */
  function showToast(message, type = 'info') {
    // Remove any toast that's already on screen to avoid stacking.
    const old = document.getElementById('rb-toast');
    if (old) old.remove();

    const t = document.createElement('div');
    t.id        = 'rb-toast';
    t.className = `rb-toast rb-toast--${type}`;
    t.textContent = message;
    document.body.appendChild(t);

    // rAF ensures the element is painted before the class is added,
    // so the CSS opacity/transform transition fires correctly.
    requestAnimationFrame(() => t.classList.add('rb-toast--show'));

    // Begin fade-out after 2.8 s, then remove element after transition.
    setTimeout(() => {
      t.classList.remove('rb-toast--show');
      setTimeout(() => t.remove(), 300); // Match CSS transition duration.
    }, 2800);
  }


  // ══════════════════════════════════════════════════════════
  // AVATAR COLOUR & INITIALS
  // Generates consistent, deterministic avatars for users who
  // haven't uploaded a profile photo.
  // ══════════════════════════════════════════════════════════

  /**
   * Palette of distinct background colours for generated avatars.
   * Chosen for reasonable contrast with white initials text.
   * 10 colours means usernames must produce the same charCode sum
   * modulo 10 to share a colour — collisions are acceptable here.
   */
  const COLORS = [
    '#f97316', // orange
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#f43f5e', // rose
    '#3b82f6', // blue
    '#a855f7', // purple
    '#14b8a6', // teal
    '#e11d48', // crimson
    '#0ea5e9', // sky
  ];

  /**
   * Returns a deterministic background colour for a given username.
   *
   * HOW IT WORKS:
   *   Sums the char codes of every character in the username, then
   *   takes that sum modulo the palette length. This means the same
   *   username always maps to the same colour — the avatar looks
   *   consistent across sessions, page reloads, and devices.
   *
   * @param {string} username
   * @returns {string} A hex colour string from the COLORS palette.
   */
  function getAvatarColor(username) {
    let h = 0;
    for (let i = 0; i < username.length; i++) h += username.charCodeAt(i);
    return COLORS[h % COLORS.length];
  }

  /**
   * Derives the two-letter initials shown inside a generated avatar.
   * Takes the first two characters of the username and uppercases them.
   * e.g. "alice" → "AL",  "x" → "X"
   *
   * @param {string} username
   * @returns {string} 1–2 uppercase characters.
   */
  function getInitials(username) {
    return username.slice(0, 2).toUpperCase();
  }

  /**
   * Creates and returns a styled <div> element that renders as a
   * coloured avatar with the user's initials — used when no profile
   * photo is available.
   *
   * The element receives:
   *   • className  : 'av' plus an optional size modifier (e.g. 'av sm').
   *   • background : a deterministic colour from getAvatarColor().
   *   • textContent: the user's initials from getInitials().
   *
   * CSS required: .av (base avatar styles), plus any size modifier
   * classes your stylesheet defines (e.g. .sm, .lg).
   *
   * @param {string} username       - The user whose avatar to build.
   * @param {string} [size='']      - Optional CSS size-modifier class.
   * @returns {HTMLDivElement}      The ready-to-append avatar element.
   */
  function avatar(username, size = '') {
    const el = document.createElement('div');
    el.className  = `av ${size}`.trim(); // Trim in case size is empty.
    el.style.background = getAvatarColor(username);
    el.textContent      = getInitials(username);
    return el;
  }


  // ══════════════════════════════════════════════════════════
  // PUBLIC API
  // Only these functions are exposed outside the IIFE.
  // Internal helpers (parseDate, COLORS) remain private.
  // ══════════════════════════════════════════════════════════
  return {
    generateId,    // Generate a short unique ID string.
    timeAgo,       // Convert a date to a relative time label ("5m", "3h"…).
    isToday,       // Check whether a date is today's calendar date.
    escapeHtml,    // Escape user content for safe innerHTML insertion.
    showToast,     // Display a temporary pop-up notification.
    getAvatarColor,// Get a deterministic colour for a username.
    getInitials,   // Get 1–2 uppercase initials from a username.
    avatar,        // Build a coloured initials avatar <div> element.
  };
})();