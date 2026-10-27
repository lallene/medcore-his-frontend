# MedCore HIS Frontend

Frontend de MedCore HIS, une plateforme hospitalière moderne pour la gestion des patients, assurances, bons de prise en charge, consultations et workflows médicaux.

## Stack

- SvelteKit
- Svelte 5
- TypeScript
- Tailwind CSS
- Axios
- Lucide Icons

## Fonctionnalités

- Authentification JWT
- Dashboard
- Patient Workspace
- Insurance Workspace
- Voucher Workspace
- Consultation Workspace initial
- Design System MedCore

## Node.js

La ligne supportée est Node.js 24. `.nvmrc` est la référence. La CI (`node-version-file`) et les deux étapes Docker (`NODE_VERSION`, défaut 24) suivent cette ligne. Le npm livré avec Node 24 suffit. La version présente sur une machine de développement n'est pas le contrat : `node --version` doit afficher `v24` avant un build de release.

```bash
node --version
npm --version
```

## Installation

```bash
npm ci
cp .env.example .env
npm run dev
```
