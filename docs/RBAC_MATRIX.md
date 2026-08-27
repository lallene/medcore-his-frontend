# LOT 21 — Matrice RBAC (référence)

Source de vérité code : `backend/internal/core/rbac/staff_permissions.go`.

Overlays runtime : table `rbac_matrix_overrides` (permission `rbac.matrix.manage`).

## Fonctions métier

| Code                               | Pack principal                                               |
| ---------------------------------- | ------------------------------------------------------------ |
| ACCUEIL                            | patients + queue réception                                   |
| INFIRMIER / AIDE_SOIGNANT          | triage + clinique lecture                                    |
| Spécialité médicale                | `StaffPhysicianPermissions` (file médecin, consultations, …) |
| CAISSIER / FACTURATION / COMPTABLE | cash / billing / créances                                    |
| BIOLOGISTE / RADIOLOGIE            | lab / imaging                                                |
| SUPPORT_*                          | ticketing                                                    |
| DIRECTEUR_MEDICAL                  | lecture clinique large + queue globale                       |
| DIRECTEUR_ADMINISTRATIF            | staff, org, QA, RBAC admin, finance lecture, queue globale   |

## Domaines catalogue UI

Patients · Patient Queue · Consultations · Hospitalisation · Laboratoire · Imagerie · Pharmacie · Billing · Cash · Insurance · Receivables · Staff · Organization · Ticketing · QA · RBAC · Administration

## Sensibles

`*`, `rbac.*`, `staff.manage`, `billing.cancel`, `cash.payment.cancel`, `queue.read.all`, `ticket.read.all`, `organization.manage`

Voir aussi : `docs/RBAC_AUDIT.md`, `backend/docs/RBAC_ADMIN.md`.
