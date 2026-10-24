/**
 * MedCore Design Tokens — source officielle TypeScript.
 * Les valeurs miroir vivent dans `src/routes/layout.css` (:root / @theme).
 * Une couleur = une intention stable.
 */

export const medcoreColors = {
	primary: '#0E4C92',
	primaryHover: '#0B3D75',
	primaryActive: '#093263',
	primaryForeground: '#FFFFFF',
	primarySoft: '#EEF4FB',
	primaryBorder: '#C9DBF0',

	/** Action alternative / surface secondaire — neutre, jamais teal. */
	secondary: '#F1F5F9',
	secondaryForeground: '#0F172A',

	/** Accent de marque / validation positive. */
	brandAccent: '#18B893',
	accent: '#EEF4FB',
	accentForeground: '#0E4C92',

	neutral: {
		background: '#F5F7FA',
		surface: '#FFFFFF',
		surfaceMuted: '#F2F5F8',
		surfaceSunken: '#EAEFF4',
		border: '#DDE3EA',
		borderStrong: '#C5CFDA',
		textPrimary: '#0F172A',
		textSecondary: '#334155',
		textMuted: '#5B6B80'
	},

	/**
	 * `base` sert aux icônes, graphiques et repères ; `strong` au texte et aux
	 * fonds pleins (contraste AA sur blanc) ; `soft`/`border` aux surfaces teintées.
	 */
	semantic: {
		success: '#18B893',
		successStrong: '#047857',
		successSoft: '#ECFDF5',
		successBorder: '#A7F3D0',
		successForeground: '#FFFFFF',
		warning: '#F59E0B',
		warningStrong: '#B45309',
		warningSoft: '#FFFBEB',
		warningBorder: '#FDE68A',
		warningForeground: '#1C1917',
		danger: '#EF4444',
		dangerStrong: '#B91C1C',
		dangerSoft: '#FEF2F2',
		dangerBorder: '#FECACA',
		dangerForeground: '#FFFFFF',
		info: '#0EA5E9',
		infoStrong: '#0369A1',
		infoSoft: '#F0F9FF',
		infoBorder: '#BAE6FD',
		infoForeground: '#FFFFFF'
	},

	sidebar: {
		bg: '#0A1A2B',
		fg: '#E6EEF6',
		muted: '#8EA3B9',
		accent: '#13283E',
		border: '#172F47',
		ring: '#18B893'
	}
} as const;

/**
 * Échelle typographique par rôle. Graisses : 400 (texte), 500 (navigation),
 * 600 (titres, labels), 700 réservé aux valeurs clés.
 */
export const medcoreTypography = {
	display: 'text-4xl font-semibold tracking-tight text-foreground',
	pageTitle: 'text-2xl font-semibold tracking-tight text-foreground md:text-3xl',
	sectionTitle: 'text-lg font-semibold text-foreground',
	cardTitle: 'text-base font-semibold text-foreground',
	body: 'text-sm text-foreground-secondary',
	small: 'text-small text-foreground-secondary',
	label: 'mb-1.5 block text-small font-semibold text-foreground-secondary',
	helper: 'mt-1.5 text-xs text-muted-foreground',
	caption: 'text-xs text-muted-foreground',
	table: 'text-sm text-foreground-secondary',
	kpi: 'text-2xl font-bold tabular-nums tracking-tight text-foreground',
	code: 'font-mono text-xs text-foreground-secondary',
	eyebrow: 'text-xs font-semibold uppercase tracking-eyebrow text-primary'
} as const;

/** Espacements (multiples de 4 px). */
export const medcoreSpacing = {
	'1': '0.25rem',
	'2': '0.5rem',
	'3': '0.75rem',
	'4': '1rem',
	'5': '1.25rem',
	'6': '1.5rem',
	'8': '2rem',
	'10': '2.5rem',
	'12': '3rem',
	'16': '4rem'
} as const;

/** Rayons effectifs (base `--radius` = 0.5rem). */
export const medcoreRadius = {
	sm: '0.3rem',
	md: '0.4rem',
	lg: '0.5rem',
	xl: '0.7rem',
	'2xl': '0.9rem'
} as const;

export const medcoreShadow = {
	none: 'none',
	xs: '0 1px 2px rgb(15 23 42 / 0.04)',
	sm: '0 1px 3px rgb(15 23 42 / 0.06), 0 1px 2px rgb(15 23 42 / 0.04)',
	md: '0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
	xl: '0 20px 40px -12px rgb(15 23 42 / 0.2)',
	/** Alias historiques. */
	card: '0 1px 2px rgb(15 23 42 / 0.04)',
	cardHover: '0 1px 3px rgb(15 23 42 / 0.06), 0 1px 2px rgb(15 23 42 / 0.04)',
	modal: '0 20px 40px -12px rgb(15 23 42 / 0.2)'
} as const;

/** Couches d'empilement (miroir des variables `--z-*`). */
export const medcoreZIndex = {
	sticky: 10,
	dropdown: 20,
	topbar: 30,
	backdrop: 35,
	sidebar: 40,
	modal: 50,
	toast: 60
} as const;

/** Hauteurs de contrôle (boutons, champs, selects). */
export const medcoreControlHeight = {
	sm: '2rem',
	md: '2.5rem',
	lg: '2.75rem'
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
