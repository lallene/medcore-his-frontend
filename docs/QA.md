# MedCore Automated QA

## Architecture

La release gate suit la chaîne `unit → integration → PostgreSQL 17 éphémère → migration → --demo-full → backend/frontend dédiés → Playwright → preuves → PASS/FAIL`.

- Les tests Go et Node restent les contrôles unitaires rapides.
- Les tests PostgreSQL utilisent des schémas temporaires supprimés en fin de test.
- Playwright exerce l’application réelle sans réimplémenter les règles métier.
- Le backend conserve seulement les métadonnées des campagnes et les chemins/URLs d’artefacts.
- Aucun endpoint QA ne lance une commande. L’ingestion est réalisée par `go run ./cmd/qa-import qa-summary.json` dans CI.
- Un scénario seulement planifié reste `NOT_IMPLEMENTED`; un scénario non joué reste `SKIPPED`. Aucun des deux n'est converti en PASS.

## Exécution locale

Préparer exclusivement `medcore_full_demo`, démarrer le backend sur `8080` et le frontend sur `4173`, puis définir les variables de `.env.qa.example` dans le shell.

```bash
npm test
npm run test:e2e:smoke
npm run test:e2e:critical
npm run test:e2e:full
```

Les suites sont séparées ainsi :

- Smoke : login, dashboard, patients, Patient 360, consultations, logout.
- Critical : Smoke, Auth/RBAC négatif, Organization et contrôles critiques ajoutés ultérieurement.
- Full : toutes les spécifications, destinée au nightly, au manuel ou aux releases majeures.

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

Le workflow `e2e-release-gate.yml` vit dans le frontend, qui possède Playwright. Il checkout le backend `lallene/medcore-his`, crée PostgreSQL 17 avec une base nommée exactement `medcore_full_demo`, exécute les gates backend/frontend, puis Playwright. Pour un backend privé, `MEDCORE_BACKEND_READ_TOKEN` doit fournir un accès lecture. Les artefacts sont uploadés même après échec et l’étape finale propage l’échec critique.

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
