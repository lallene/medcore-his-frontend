/**
 * MedCore Design Tokens — source officielle TypeScript (LOT 18).
 * Les valeurs miroir vivent aussi dans `src/routes/layout.css` (:root).
 * Une couleur = une intention stable.
 */

export const medcoreColors = {
	primary: '#0E4C92',
	primaryHover: '#0B3D75',
	primaryForeground: '#FFFFFF',

	/** Action alternative / surface secondaire — neutre, jamais teal. */
	secondary: '#E2E8F0',
	secondaryForeground: '#0F172A',

	/** Accent de marque / validation positive. */
	brandAccent: '#18B893',
	accent: '#E7F3FF',
	accentForeground: '#0E4C92',

	neutral: {
		background: '#F8FAFC',
		surface: '#FFFFFF',
		surfaceMuted: '#EEF4F8',
		border: '#DBE7EF',
		textPrimary: '#0F172A',
		textSecondary: '#334155',
		textMuted: '#64748B'
	},

	semantic: {
		success: '#18B893',
		successForeground: '#FFFFFF',
		warning: '#F59E0B',
		warningForeground: '#1C1917',
		danger: '#EF4444',
		dangerForeground: '#FFFFFF',
		info: '#0EA5E9',
		infoForeground: '#FFFFFF'
	},

	sidebar: {
		bg: '#081827',
		fg: '#EAF3FB',
		accent: '#102B45',
		border: '#12314F',
		ring: '#18B893'
	}
} as const;

export const medcoreTypography = {
	pageTitle: 'text-3xl font-bold tracking-tight text-slate-900',
	sectionTitle: 'text-lg font-semibold text-slate-900',
	cardTitle: 'text-base font-semibold text-slate-900',
	body: 'text-sm text-slate-700',
	label: 'mb-2 block text-sm font-semibold text-slate-700',
	helper: 'mt-1.5 text-xs text-slate-500',
	caption: 'text-xs text-slate-500',
	table: 'text-sm text-slate-700',
	kpi: 'text-2xl font-bold tabular-nums text-slate-950',
	code: 'font-mono text-xs text-slate-600',
	eyebrow: 'text-xs font-bold uppercase tracking-[0.2em] text-primary'
} as const;

export const medcoreSpacing = {
	xs: '0.25rem',
	sm: '0.5rem',
	md: '1rem',
	lg: '1.5rem',
	xl: '2rem',
	'2xl': '3rem'
} as const;

export const medcoreRadius = {
	sm: '0.5rem',
	md: '0.75rem',
	lg: '0.875rem',
	xl: '1.25rem',
	'2xl': '1.5rem'
} as const;

export const medcoreShadow = {
	none: 'none',
	sm: '0 1px 2px rgba(15, 23, 42, 0.05)',
	card: '0 2px 8px rgba(15, 23, 42, 0.04)',
	cardHover: '0 6px 18px rgba(15, 23, 42, 0.06)',
	modal: '0 20px 50px rgba(15, 23, 42, 0.18)'
} as const;

/** @deprecated Prefer medcoreColors — kept for imports existants. */
export const medcoreTheme = {
	colors: {
		primary: medcoreColors.primary,
		primaryHover: medcoreColors.primaryHover,
		secondary: medcoreColors.secondaryForeground,
		success: medcoreColors.semantic.success,
		warning: medcoreColors.semantic.warning,
		danger: medcoreColors.semantic.danger,
		background: medcoreColors.neutral.background,
		card: medcoreColors.neutral.surface,
		border: medcoreColors.neutral.border,
		text: medcoreColors.neutral.textPrimary,
		muted: medcoreColors.neutral.textMuted
	},
	radius: medcoreRadius,
	shadow: {
		card: medcoreShadow.card,
		cardHover: medcoreShadow.cardHover
	}
};
