# MedCore Design System (LOT 18)

**Principe :** « Rien de plus naturel que de reconnaître sa maison. »

Une intention visuelle = une représentation stable, tous modules confondus.

---

## 1. Principes MedCore

1. **Cohérence avant nouveauté** — ne pas inventer un pattern par module.
2. **Intention stable** — danger = destruction ; success = validation ; primary = action principale.
3. **Une primaire dominante** par page.
4. **Accessibilité minimale** — labels, focus visible, pas d’info uniquement par couleur.
5. **Desktop prioritaire** — mobile pour opérations raisonnables uniquement.
6. **Charte existante** — primary `#0E4C92`, success/accent `#18B893`, Inter Variable.

## 2. Palette

| Token                         | Hex            | Intention                 |
| ----------------------------- | -------------- | ------------------------- |
| primary                       | `#0E4C92`      | Action principale         |
| secondary                     | `#E2E8F0`      | Action alternative neutre |
| success / brand-accent        | `#18B893`      | Validation / succès       |
| warning                       | `#F59E0B`      | Attention                 |
| danger                        | `#EF4444`      | Destruction / erreur      |
| info                          | `#0EA5E9`      | Information               |
| background / surface / border | neutrals slate | Structure                 |

Source CSS : `src/routes/layout.css`
Source TS : `src/lib/design/theme.ts`

## 3. Tokens

- Couleurs sémantiques + surfaces
- Typographie (`medcoreTypography`)
- Spacing `xs…2xl`
- Radius `sm…2xl`
- Ombres `sm`, `card`, `cardHover`, `modal`

## 4. Typography

| Rôle                            | Usage                    |
| ------------------------------- | ------------------------ |
| pageTitle                       | H1 page                  |
| sectionTitle                    | H2 section / FormSection |
| cardTitle                       | titres de carte          |
| body / label / helper / caption | formulaires & texte      |
| kpi                             | MetricCard               |
| eyebrow                         | PageHeader eyebrow       |

## 5. Spacing

Échelle officielle `xs sm md lg xl 2xl` — préférer `gap-3/4/6` et `p-4/6` alignés.

## 6. Buttons

Composant : `ui/Button.svelte`

| Variant   | Usage                                  |
| --------- | -------------------------------------- |
| primary   | Créer / Enregistrer / action dominante |
| secondary | Alternative                            |
| ghost     | Annuler / léger                        |
| danger    | Supprimer                              |
| success   | Validation explicitement positive      |

Tailles : `sm` `md` `lg`. États : hover, focus-visible, disabled, loading.

`IconButton` exige `aria-label`.

## 7. Forms

`FormField` = Label + control + helper/error.
`FormSection` = section à grille 1/2/3 colonnes.
Controls : `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Switch`.

## 8. Tables

`DataTable` + toolbar (`SearchInput`) + empty/loading officiels.
Actions de ligne toujours à droite.

## 9. Cards

`Card`, `MetricCard` — surface, border, shadow card.

## 10. Badges / status

`Badge` (tone) + `StatusBadge` (statut métier via `src/lib/design/status.ts`).

PASSED/RESOLVED → success ; FAILED/P1 → danger ; DRAFT → warning ; etc.

## 11. Alerts

`Alert` tones : info / success / warning / danger (+ icône, pas couleur seule).

## 12. Modal

`Modal` (`role="dialog"`, Escape, overlay).
`ConfirmDialog` : Cancel ghost + Confirm danger/primary.

## 13. Navigation

Sidebar + Header inchangés fonctionnellement (RBAC).
Lien catalogue : `/admin/design-system` (`qa.read` / `*`).
`Breadcrumb` pour pages détail.

## 14. Page layouts

- **Liste** : PageHeader → KPI → FilterBar → Table → Pagination
- **Détail** : Breadcrumb → header identité → sections
- **Create/Edit** : PageHeader → FormSections → actions
- **Dashboard** : hero/KPIs → sections

## 15. Accessibility

- focus-visible global
- labels / sr-only
- `aria-invalid`, `aria-busy`, `role="alert|dialog|status|switch|tablist"`
- IconButton label obligatoire

## 16. Responsive

Grilles `md:` / `xl:` ; pas de régression clinique forcée en mobile étroit.

## 17. Do / Don’t

**Do**

- Utiliser `Button` / `StatusBadge` / `PageHeader` / `Alert`
- Une couleur = une intention
- Confirmer les destructions via `ConfirmDialog`

**Don’t**

- `bg-blue-600` pour primary (utiliser tokens)
- Teal pour bouton secondary
- Nouveau layout formulaire ad-hoc
- Violet décoratif hors intention
- Contournement Release Gate pour un souci CSS

## Showcase

`/admin/design-system` — documentation interactive, aucune mutation métier.

## Migration

Voir `docs/DESIGN_MIGRATION_MATRIX.md` et `docs/DESIGN_AUDIT.md`.
