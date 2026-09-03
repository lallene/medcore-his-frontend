# MedCore Automated QA

## Architecture

La release gate (`e2e-release-gate.yml`) suit la chaîne :

`migrate public → backend unit (sans Postgres) → Ticketing Postgres → Scheduling Postgres (LOT 23J) → --demo-full → API + preview → npm test/check/lint/build → Playwright critical → preuves → PASS/FAIL`.

- Les tests Go et Node restent les contrôles unitaires rapides.
- Les tests PostgreSQL `patient_queue` / `ticketing` utilisent des **schémas temporaires** (`pq_*`, `ticketing_*`) supprimés en fin de test ; ils ne mutent pas le schéma `public` du seed E2E.
- Playwright exerce l’application réelle sans réimplémenter les règles métier.
- Le backend conserve seulement les métadonnées des campagnes et les chemins/URLs d’artefacts.
- Aucun endpoint QA ne lance une commande. L’ingestion est réalisée par `go run ./cmd/qa-import qa-summary.json` dans CI.
- Un scénario seulement planifié reste `NOT_IMPLEMENTED`; un scénario non joué reste `SKIPPED`. Aucun des deux n'est converti en PASS.

### Scheduling release gate (LOT 23J)

Le module Scheduling est release-gated lorsque **tous** ces contrôles passent dans CI :

1. **Scheduling PostgreSQL integration gate** — `go test ./internal/modules/patient_queue/ ./internal/core/rbac/ -count=1` avec `TEST_DATABASE_URL` (inclut RBAC 23I, booking, lifecycle, check-in, availability, schedules).
2. **Frontend unit/static** — `npm test`, `check`, `lint`, `build`.
3. **Playwright critical** — specs Agenda (`e2e/agenda`) et Patient 360 appointments (`e2e/patient-360`) taguées `@critical` / `@smoke` (inclut historique 23K + deep-link Agenda).

`npm run test:e2e:scheduling` reste un **helper local** : rebuild + preview contre une API déjà démarrée (défaut `:18082`), exécute **uniquement** `e2e/agenda/agenda.spec.ts` (pas Patient 360), **sans seed**. Ce n’est pas la release gate CI.

## Exécution locale

Préparer `medcore_full_demo`, démarrer un backend **courant** (LOT 23F.1+ / 23I+) et le frontend preview, puis définir les variables de `.env.qa.example` dans le shell.

`PUBLIC_API_URL` est figé au **build** (`$env/static/public`). Pour pointer Playwright vers un backend QA (ex. `:18082`) :

```bash
# Backend courant + fixtures scheduling si besoin:
#   DATABASE_URL=... go run ./cmd/seed --demo-scheduling
PUBLIC_API_URL=http://127.0.0.1:18082 QA_API_URL=http://127.0.0.1:18082 npm run test:e2e:scheduling
```

Postgres Scheduling (miroir CI) :

```bash
TEST_DATABASE_URL=postgres://…/medcore_full_demo?sslmode=disable \
  go test ./internal/modules/patient_queue/ ./internal/core/rbac/ -count=1
```

Ne pas réutiliser un `npm run build` antérieur ciblant `:8080` : le preview servirait encore l’ancienne URL (CORS / 404).

Autres suites :

```bash
npm test
npm run test:e2e:smoke
npm run test:e2e:critical
npm run test:e2e:full
```

Les suites Playwright sont séparées ainsi :

- **Smoke** : login, dashboard, patients, Patient 360 chrome, consultations, logout (+ `QA-AGENDA-DASHBOARD-001`).
- **Critical** (défaut release gate) : Smoke + Auth/RBAC + Organization + **Agenda / P360 appointments Scheduling** (historique 23K, deep-link) + autres `@critical`.
- **Full** : toutes les spécifications (`QA_SUITE=full`), nightly / manuel / releases majeures — ne prétend pas couvrir des scénarios `NOT_IMPLEMENTED`.

## Variables

`QA_BASE_URL`, `QA_API_URL`, `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_ENVIRONMENT`, `QA_RUN_ID`, `QA_SUITE`. Les secrets réels sont injectés par le gestionnaire CI et ne sont jamais inscrits dans Git.

## Rapports et debugging

Chaque run produit :

- `playwright-report/` ;
- `test-results/junit.xml` ;
- `test-results/playwright-results.json` ;
- `test-results/qa-summary.json` ;
- screenshots, traces et vidéos uniquement après échec ;
- logs console navigateur et réponses HTTP 5xx après échec.

Le résumé porte le type de campagne (`SMOKE`, `CRITICAL`, `FULL` ou `PRODUCTION-SMOKE`) et les compteurs PASS, FAIL, SKIPPED et NOT_IMPLEMENTED. L'importeur rejette les statuts, doublons et compteurs incohérents.

Ouvrir le rapport avec `npx playwright show-report`. Une trace peut être inspectée avec `npx playwright show-trace <trace.zip>`.

## GitHub Actions et orchestration multi-repo

Le workflow `e2e-release-gate.yml` vit dans le frontend, qui possède Playwright. Il checkout le backend `lallene/medcore-his`, crée PostgreSQL 17 avec une base nommée exactement `medcore_full_demo`, exécute :

1. `go test ./...` **sans** `TEST_DATABASE_URL` (unitaires) ;
2. Ticketing PostgreSQL integration gate ;
3. **Scheduling PostgreSQL integration gate** (`patient_queue` + `rbac`, LOT 23J) ;
4. seed `--demo-full`, API, frontend quality, Playwright critical.

Pour un backend privé, `MEDCORE_BACKEND_READ_TOKEN` doit fournir un accès lecture. Les artefacts sont uploadés même après échec et l’étape finale propage l’échec critique.

Le workflow ne déploie rien. Une future pipeline de déploiement devra dépendre du succès Backend + Frontend + Build + Smoke + Critical. Full reste manuel/nightly.

## Achi Cloud, DEMO et production

- Demo : `QA_BASE_URL=https://demo.medcore.achicloud.com`, suites configurées explicitement.
- Production : `QA_ENVIRONMENT=production QA_SUITE=production-smoke`. Toute autre suite est refusée avant le démarrage de Playwright.
- Production n’autorise que frontend, `/health`, TLS/headers et éventuellement un compte de supervision explicitement configuré.
- Ne jamais lancer de seed, création patient, paiement, dispensation ou modification clinique en production.

## Ajouter un scénario

1. Ajouter une clé stable `QA-DOMAINE-NNN` et une criticité dans `QA_MATRIX.md`.
2. Utiliser les clés DEMO métier, jamais un ID numérique fragile.
3. Privilégier rôles, labels et textes stables ; ajouter `qa-<module>-<element>` seulement si nécessaire.
4. Ne pas utiliser d’attente arbitraire, `nth-child` ou dépendance implicite entre tests.
5. Vérifier la garde production et la génération des preuves.

## Sécurité

Les screenshots ne doivent jamais cibler les mots de passe, JWT ou chaînes de connexion. Aucun artefact lourd n’est stocké dans PostgreSQL. L’importeur refuse toute base autre que `medcore_full_demo`, sauf autorisation explicite `QA_ALLOW_DATABASE`, et refuse les résumés marqués production.
