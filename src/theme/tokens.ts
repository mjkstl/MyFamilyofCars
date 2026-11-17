/**
 * Shared design tokens — the single source of truth for colour, spacing,
 * corner radius and type sizes.
 *
 * Why this file exists: before it, every screen hard-coded its own hex
 * values (blue, teal, green and amber all competed as "the" action
 * colour), which is why screens felt inconsistent with one another.
 * New or reworked screens should import from here instead of typing a
 * hex value. Screens not yet migrated still work — migrate them one at
 * a time as each gets its UI pass.
 *
 * Rule of thumb for colour roles:
 *   primary  → the ONE main action on a screen (Save, Invite, Add)
 *   accent   → warm highlight for stories / memories / keepsakes
 *   success  → status only ("Currently driving"), never a button colour
 *   danger   → destructive actions and errors only
 */
export const colors = {
  // Brand — taken from the logo lettering (navy/blue) and its gold rim.
  primary: '#1D4ED8',
  primaryDark: '#1E3A8A',
  primarySoft: '#DBEAFE',
  accent: '#B45309',
  accentSoft: '#FEF3C7',
  gold: '#F5B301',

  // Neutrals
  ink: '#0F172A',
  text: '#334155',
  muted: '#64748B',
  faint: '#94A3B8',
  // Placeholder text inside inputs. Same value as `muted`: 4.8:1 contrast
  // on white (WCAG AA needs 4.5:1). `faint` (2.6:1) and the iOS default
  // placeholder grey were too light to read on a real iPhone.
  placeholder: '#64748B',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  background: '#F8FAFC',

  // Status
  success: '#166534',
  successSoft: '#DCFCE7',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FCA5A5',

  overlay: 'rgba(15,23,42,0.45)',
  white: '#FFFFFF',
} as const;

/** 4-point spacing scale. Use these instead of ad-hoc numbers. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Type sizes. Body text is 16 so iOS never zooms an input on focus. */
export const font = {
  display: 24,
  title: 20,
  heading: 17,
  body: 16,
  label: 14,
  small: 13,
  tiny: 12,
  // 'Trebuchet MS' ships with iOS and most desktops; Android falls back
  // to its system font automatically, so this is safe everywhere.
  brandFamily: 'Trebuchet MS',
} as const;

/** Apple's minimum comfortable tap target is 44pt. */
export const MIN_TAP = 44;

/** One shared card shadow so elevation looks the same everywhere. */
export const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;
