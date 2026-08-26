# MedCore HIS — Design System Audit (LOT 18 — Phase 1)

**Date:** 2026-08-26
**Scope:** `frontend/src` (≈130 `.svelte`, ≈103 `.ts`, `routes/layout.css`)
**Méthode:** inventaire ripgrep + revue des primitives `ui/` et layouts
**Statut:** READ-ONLY — aucune modification visuelle avant cet audit

---

## 1. Verdict

MedCore dispose déjà d’une **base de tokens CSS** (`layout.css`) et d’un **petit kit `ui/`** (11 composants), mais l’UI réelle est majoritairement **Tailwind ad-hoc + hex `#0E4C92`**.

Conséquence : l’utilisateur ne retrouve pas toujours les mêmes repères d’un module à l’autre (boutons, statuts, formulaires, headers, overlays).

---

## 2. Inventaire quantifié

### 2.1 Couleurs

| Métrique                                       | Valeur                     |
| ---------------------------------------------- | -------------------------- |
| Occurrences hex `#...`                         | **≈486**                   |
| Hex uniques                                    | **≈39**                    |
| Fichiers avec hex                              | **≈64**                    |
| `#0E4C92` (primary brand)                      | **≈342**                   |
| `#18B893` (secondary / success brand)          | **≈23**                    |
| Utilitaires Tailwind couleur (bg/text/border…) | **≈4 254**                 |
| Famille dominante                              | **slate ≈3 036**           |
| `bg-primary` / `text-primary` (tokens CSS)     | **≈0** dans les composants |

**Top hex :** `#0E4C92`, `#18B893`, `#F59E0B`, `#22C55E`, `#EA580C`, `#EF4444`, `#7C3AED`, `#FFFFFF`, `#F7F9FC`, `#0F172A`.

### 2.2 Typographie

| Pattern                         |             Approx. |
| ------------------------------- | ------------------: |
| `<h1`                           |    48 (47 fichiers) |
| `text-2xl\|3xl\|4xl`            |                 110 |
| Eyebrow `font-black uppercase`  |                ≈246 |
| `text-[#0E4C92]` labels section |                ≈164 |
| Police                          | Inter Variable (OK) |

**Anomalie :** titres de page fragmentés (`text-3xl font-black` ×22, `text-4xl` ×5, `text-2xl` ×4, + one-offs).

### 2.3 Boutons

| Pattern            |                  Approx. |
| ------------------ | -----------------------: |
| Raw `<button`      |       ≈328 (71 fichiers) |
| Import `ui/Button` | 17 fichiers / ≈52 usages |
| Ratio raw / Button |                 **≈6:1** |

`Button.svelte` utilise `blue-600` / `slate-200` / `green-600` / `red-600` — **pas** les tokens `--primary` / `--secondary`.

### 2.4 Formulaires

| Pattern                                                      |                               Approx. |
| ------------------------------------------------------------ | ------------------------------------: |
| `FormField` partagé                                          |                                 **0** |
| Raw `<input>`                                                |                                  ≈704 |
| Raw `<select>`                                               |                                  ≈147 |
| Raw `<textarea>`                                             |                                  ≈134 |
| Consommateurs `ui/Input                                      |                                Select | Textarea` | ≈1 chacun |
| `<label`                                                     |                                  ≈398 |
| Label dominant `block text-sm font-bold text-slate-700 mb-2` |                                  ≈257 |
| `grid-cols-*`                                                | ≈436 (`md:grid-cols-2` ×122 dominant) |

### 2.5 Tables

| Pattern                 |                                 Approx. |
| ----------------------- | --------------------------------------: |
| `<table` / `<thead`     |                                 20 / 20 |
| `DataTable.svelte`      | 1 composant, **2** pages consommatrices |
| Pages liste hand-rolled |                                majorité |

### 2.6 Cartes / badges / alertes

| Pattern                               |      Approx. |
| ------------------------------------- | -----------: |
| `ui/Card`                             |  ≈18 imports |
| Cartes `rounded-2xl border` hors Card | ≈82 fichiers |
| `ui/Badge`                            |    ≈4 usages |
| Pills inline `rounded-full` + couleur |          ≈91 |
| Alertes partagées                     |        **0** |

### 2.7 Modales / drawers

| Pattern                  |                 Approx. |
| ------------------------ | ----------------------: |
| Dialog / Modal partagé   |                   **0** |
| `role="dialog"`          |                   **0** |
| Overlays `fixed inset-0` | 4 (beds, PEC, pharmacy) |
| ConfirmDialog standard   |                   **0** |

### 2.8 États vides / loading

| Pattern                    |             Approx. |
| -------------------------- | ------------------: |
| EmptyState partagé         |               **0** |
| Copies « Aucun / vide »    | ≈124 (≈44 fichiers) |
| `ui/Spinner`               |        **0** import |
| `animate-spin`             |          6 fichiers |
| Skeleton / `animate-pulse` |                   3 |

### 2.9 Navigation / pages

| Élément          | État                         |
| ---------------- | ---------------------------- |
| `Sidebar.svelte` | Nav principale permissionnée |
| `Header.svelte`  | Search + user + logout       |
| `PageHeader`     | **Absent**                   |
| Breadcrumb       | Non standardisé              |
| Dark mode        | Scaffold CSS **non utilisé** |

### 2.10 Kit `ui/` actuel (11)

`Avatar`, `Badge`, `Button`, `Card`, `Divider` (stub), `Info`, `Input`, `Select`, `Spinner`, `StatisticCard`, `Textarea`.

### 2.11 Pages / composants

| Métrique              | Valeur                    |
| --------------------- | ------------------------- |
| Routes `+page.svelte` | ≈47                       |
| Composants `.svelte`  | ≈81 sous `lib/components` |

---

## 3. Anomalies principales (P1 UX)

1. **Primary dual-system** — `#0E4C92` ×342 vs `Button` `bg-blue-600` (`#2563EB`).
2. **Secondary collision** — CSS teal `#18B893` vs `Button` secondary slate vs éventuel `theme.ts` slate.
3. **Tokens CSS quasi-ignorés** — `bg-primary` / `text-primary` absents des composants.
4. **Adoption Button ≈15 %** — actions similaires = formes/couleurs différentes selon module.
5. **Pas de Modal/ConfirmDialog** — overlays ad-hoc, a11y dialog absente.
6. **Statuts divergents** — ex. draft amber vs slate ; success green vs emerald vs `#18B893`.
7. **Badge sous-utilisé** — 4 vs ≈91 chips inline.
8. **Formulaires copy-paste** — 0 FormField ; 704 inputs raw.
9. **Pas de PageHeader / EmptyState / Skeleton** — chrome de page non reproductible.
10. **shadcn-svelte phase 0** — config + import CSS, primitives non générées ; kit maison incomplet.

---

## 4. Mapping intentions → dérives actuelles

| Intention           | Attendu            | Observé                                     |
| ------------------- | ------------------ | ------------------------------------------- |
| Action principale   | Primary brand      | blue-600 **ou** hex brand **ou** raw button |
| Action secondaire   | Secondary / ghost  | souvent slate ad-hoc                        |
| Succès / validation | success token      | green **ou** emerald **ou** teal            |
| Danger              | danger             | red / rose mélangés                         |
| Warning             | warning            | amber / orange / violet ponctuel            |
| Statut métier       | StatusBadge unique | maps locales divergentes                    |

---

## 5. Pages atypiques (candidates revue)

| Zone                     | Motif                                                  |
| ------------------------ | ------------------------------------------------------ |
| Login                    | Layout hors shell ; boutons raw                        |
| Dashboard                | H1 `text-4xl` + KPI custom                             |
| Patients / Patient 360   | Mix Button + raw ; headers locaux                      |
| Ticketing                | Raw buttons ; chrome proche list pattern               |
| QA admin                 | Status chips locaux                                    |
| Beds / Pharmacy / PEC    | Modales/drawers one-off                                |
| Consultation specialties | Densité formulaire très élevée (hors migration LOT 18) |

---

## 6. Décisions LOT 18 (post-audit)

1. **Conserver** la charte MedCore existante : primary `#0E4C92`, secondary `#18B893`, neutrals slate, Inter Variable.
2. **Ne pas** introduire une nouvelle bibliothèque UI lourde ; étendre le kit `ui/` maison + tokens CSS.
3. **Ne pas** activer dark mode produit dans ce LOT.
4. **Migrer en pilote** : Login, Dashboard, Patients liste, Patient 360 (chrome), Ticketing, QA dashboard.
5. **Centraliser** StatusBadge + ConfirmDialog + FormField + PageHeader avant toute migration large.

---

## 7. Hors périmètre Phase 1

- Modifications API / PostgreSQL / RBAC / Release Gate
- Refonte métier consultations / spécialités
- Migration visuelle de tous les modules

---

_Fin de l’audit Phase 1 — prêt pour tokens et composants officiels._
