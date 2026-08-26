# MedCore Design System — Migration Matrix (LOT 18)

Statuts : `NOT_STARTED` | `PARTIAL` | `MIGRATED` | `VERIFIED`

`PARTIAL` = composants structurants du Design System adoptés, mais migration visuelle complète encore en cours (heroes, listes ou contrôles ad-hoc possibles).  
`MIGRATED` = composants officiels adoptés sur les surfaces principales.  
`VERIFIED` = migration complète réellement démontrée + contrôle sans régression fonctionnelle.

| Module                  | Statut      | Notes                                                                |
| ----------------------- | ----------- | -------------------------------------------------------------------- |
| Auth (Login)            | PARTIAL     | Button + Alert ; champs/branding encore ad-hoc ; smoke PASS          |
| Dashboard               | PARTIAL     | LoadingState + Alert ; hero/KPI dashboard encore ad-hoc ; smoke PASS |
| Patients (liste)        | PARTIAL     | Alert/Empty/Loading + tokens ; hero/filtres/list encore ad-hoc       |
| Patients (360)          | PARTIAL     | LoadingState, Alert, Breadcrumb ; chrome PatientHeader encore local  |
| Ticketing (Mes tickets) | VERIFIED    | PageHeader, FilterBar, StatusBadge ; smoke PASS                      |
| Ticketing (Support)     | MIGRATED    | PageHeader, KPI, FilterBar, StatusBadge ; colonnes métier restaurées |
| QA dashboard            | VERIFIED    | PageHeader, MetricCard, StatusBadge ; critical PASS                  |
| Design System showcase  | VERIFIED    | `/admin/design-system` ; QA-DESIGN-001 PASS                          |
| Consultations           | NOT_STARTED | Hors pilote                                                          |
| Hospitalization         | NOT_STARTED |                                                                      |
| Beds                    | NOT_STARTED | Modales ad-hoc restantes                                             |
| Laboratory              | NOT_STARTED |                                                                      |
| Imaging                 | NOT_STARTED |                                                                      |
| Pharmacy                | NOT_STARTED | Drawer ad-hoc                                                        |
| Insurance               | NOT_STARTED |                                                                      |
| PEC                     | NOT_STARTED | Overlay ad-hoc                                                       |
| Billing                 | NOT_STARTED |                                                                      |
| Cash                    | NOT_STARTED |                                                                      |
| Receivables             | NOT_STARTED |                                                                      |
| Insurance Receivables   | NOT_STARTED |                                                                      |
| Staff                   | NOT_STARTED |                                                                      |
| Organization            | NOT_STARTED |                                                                      |

## Vérifications pilotes

| Écran                      | Vérifié | Preuve                   |
| -------------------------- | ------- | ------------------------ |
| Design System              | oui     | QA-DESIGN-001 PASS       |
| Login                      | chrome  | QA-SMOKE-001 PASS        |
| Tickets liste              | oui     | QA-TICKET-SMOKE-001 PASS |
| QA dashboard               | oui     | QA-DASHBOARD-001 PASS    |
| Patients / 360 / Dashboard | chrome  | QA-SMOKE-001 PASS        |
