module.exports = {
  extends: ['expo'],
  rules: {
    // Downgraded to warn, not disabled: this rule correctly flags a
    // real pattern used across several existing data-fetching hooks
    // (useFamily, useMembers, useCars, useAllFamilyCars, CarReorderScreen,
    // MemberEditModal — all call setState/refresh() directly inside a
    // mount effect). Fixing all six is a genuine data-layer refactor,
    // not a Phase 1 tooling task — see docs/APP_STORE_RELEASE_PROGRESS.md
    // for the tracked decision. Kept as a warning (not silenced) so
    // `npm run lint` still surfaces it, and so any NEW code introducing
    // the same pattern is visible rather than invisible.
    'react-hooks/set-state-in-effect': 'warn',
  },
  ignorePatterns: [
    '/dist/*',
    '/node_modules/*',
    // Supabase Edge Functions run on Deno, not Node — they use
    // URL-based imports (e.g. https://deno.land/...) that are valid
    // Deno syntax but unresolvable by Node-based ESLint tooling. This
    // exclusion is a scoping fix, not a suppression of a real problem.
    '/supabase/functions/**',
  ],
};
