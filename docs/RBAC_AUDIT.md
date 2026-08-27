# LOT 21 — Audit RBAC ACTUEL vs CIBLE

Date : 2026-08-27
Périmètre : backend `internal/core/rbac`, `modules/staff`, `modules/auth` + frontend Sidebar / admin staff.

## Synthèse

| Dimension              | ACTUEL                                                                           | CIBLE LOT 21                                                        |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Source des permissions | Matrice Go `StaffFunctionPermissions` + pack médecin si spécialité + `admin`→`*` | Même matrice (source unique) + **overrides utilisateur** GRANT/DENY |
| Calcul effectif        | Union dédupliquée à chaque requête HTTP                                          | Idem + DENY > GRANT > héritage ; détail `source` exposé API         |
| Overrides directs      | **Absents**                                                                      | Table `staff_permission_overrides`                                  |
| Matrice éditable       | Code only (déploiement)                                                          | Lecture ACC + overlays fonction (`rbac.matrix.manage`)              |
| Scope service          | Queue = assignments ; Ticketing = primary only                                   | Documenté ; ACC affiche scopes effectifs                            |
| Access Control Center  | `/admin/staff` partiel                                                           | `/admin/access` + fiche + matrice + catalogue                       |
| Anti-lockout           | Aucun                                                                            | Validations backend                                                 |
| Audit                  | Fonctions/spé/cap/active                                                         | + overrides, services, matrice, raisons                             |
| Frontend guards        | Sidebar + boutons ; presque pas de route guard                                   | ACC gated ; backend reste autorité                                  |
| Simulation             | Absente                                                                          | Read-only « voir les accès » (pas d’impersonation JWT)              |

## ACTUEL — Backend

### Matrice

- Fichier : `backend/internal/core/rbac/staff_permissions.go`
- Fonctions : `DIRECTEUR_ADMINISTRATIF`, `DIRECTEUR_MEDICAL`, `SUPPORT_*`, `ACCUEIL`, `INFIRMIER`, `AIDE_SOIGNANT`, `SAGE_FEMME`, `BIOLOGISTE`, `RADIOLOGIE`, `CAISSIER`, `FACTURATION`, `COMPTABLE`
- Médecin : toute spécialité → `StaffPhysicianPermissions` (pas de différenciation par spécialité)
- `EffectiveStaffPermissions(role, functions, specialties)`
- Middleware auth **recalcule** les permissions depuis le profil staff (JWT permissions non fiables)

### Admin APIs staff

- `GET/POST/PUT /api/staff`, catalog, users, audit
- Permissions : `staff.read`, `staff.manage`, `staff.audit.read`
- Pas de GRANT/DENY permission, pas d’API « effective détaillée »

### Scopes

- Queue : `primary_service_id` + `staff_service_assignments` ; `queue.read.all` / `*` global
- Ticketing : **primary seulement** (divergence documentée)

### Wildcard

- `role=admin` → `*` uniquement
- `AnyPermission` : match exact ou `*`

## ACTUEL — Frontend

- Permissions lues via `jwtDecode(localStorage.medcore_token).permissions`
- Sidebar : OR de permissions requises
- `/admin/staff` : gestion profil / fonctions / services / matrice lecture
- Peu de garde route (sauf design-system) ; APIs = vraie sécurité

## Permissions

| Catégorie                  | Exemples                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Existantes & utilisées     | `patients:read`, `queue.*`, `billing.read`, `staff.manage`, …                                    |
| Orphelines / peu utilisées | `ticket.category.manage`, `ticket.sla.manage` (matrice sans routes manage)                       |
| Manquantes pour ACC        | `rbac.read`, `rbac.user.manage`, `rbac.override.manage`, `rbac.matrix.manage`, `rbac.audit.read` |
| Admin-only de fait         | Nombreuses perms de routes jamais dans une fonction métier                                       |

## Divergences FE / BE

1. Nav cachée ≠ route inaccessible
2. Helpers lab/imaging/pharmacy bypass `role===admin` ; d’autres non
3. Capabilités staff stockées mais hors permissions effectives
4. Ticketing scope ≠ queue scope

## Décisions LOT 21 (compatibilité)

1. **Ne pas** remplacer `StaffFunctionPermissions` — l’étendre et la documenter.
2. Overrides utilisateur : **DENY > GRANT > héritage** (admin `*` non soumis aux overrides).
3. Matrice globale : base code + overlays DB optionnels (permission `rbac.matrix.manage`).
4. ACC consomme les APIs `/api/access/*` ; staff existant conservé.
5. Pas d’impersonation JWT.
6. Anti-lockout sur désactivation / retrait derniers droits `staff.manage`|`rbac.*`.
