# Template Mairie

Template Astro pour sites de mairies rurales françaises, conforme à la charte
républicaine (RGAA 4.1), pensé pour être dupliqué et personnalisé par chaque
commune, et déployé simplement sur Cloudflare Workers.

## Stack

- [Astro](https://astro.build) v7 — génération de site statique
- HTML/CSS uniquement, sans framework CSS ni JavaScript côté client
  (à l'exception de l'interface d'administration Decap CMS)
- Contenu géré en Markdown (`src/content/`)
- Interface d'édition : [Decap CMS](https://decapcms.org) (`public/admin.html`)
- Hébergement : [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/)
  (assets statiques, `wrangler.jsonc`), HTTPS géré nativement
- Authentification Decap CMS : backend GitHub, via un Worker proxy OAuth
  dédié (`oauth-worker/`)

## Développement

```sh
npm install
npm run dev       # serveur local sur http://localhost:4321
npm run build     # build de production dans dist/
npm run preview   # prévisualisation du build
```

## Structure du projet

```
src/
  layouts/CharteRepublicaine.astro   # gabarit charte républicaine BBR
  components/                        # Nav, Footer, BandeauUrgence, Horaires, Actus, Associations
  content/
    config.md                        # informations de la commune (nom, SIREN, maire, contact...)
    urgence.md                       # bandeau d'alerte
    horaires.md                      # horaires d'ouverture de la mairie
    actus/                           # actualités (un fichier .md par actualité)
    associations/                    # associations locales (un fichier .md par association)
  pages/                             # index, mairie, démarches, vie-locale, legal/*
public/
  admin.html                         # interface Decap CMS
  decap-config.yml                   # configuration des collections Decap CMS
  _headers                           # headers de sécurité (voir plus bas)
oauth-worker/                        # Worker proxy OAuth GitHub pour Decap CMS
wrangler.jsonc                       # config Cloudflare Workers du site
```

Les informations de la commune (`src/content/config.md`) sont lues côté
build par `src/lib/config.ts` et injectées dans toutes les pages — il n'y a
donc qu'un seul endroit à modifier pour personnaliser un site.

## Administration (Decap CMS)

L'interface d'édition est accessible sur `/admin.html`.

- **Sans backend configuré**, `backend.name: test-repo` fait fonctionner
  l'interface sans authentification, avec des données stockées uniquement en
  mémoire dans le navigateur (rien n'est écrit sur GitHub). C'est le mode à
  utiliser pour valider l'interface avant de la connecter à un vrai dépôt.
- **Sur ce dépôt de démo**, le backend est `github`
  (`public/decap-config.yml` → `backend.name: github`) : les modifications
  faites dans `/admin.html` sont réellement commitées sur `main`, après
  connexion avec un compte GitHub ayant accès au dépôt. L'authentification
  passe par un petit Worker proxy OAuth dédié (`oauth-worker/`), Cloudflare
  n'ayant pas d'équivalent intégré à Netlify Identity/Git Gateway. Prérequis
  (à faire une fois) :
  1. Déployer `oauth-worker/` (`npm run deploy:oauth-worker`) pour obtenir
     son URL.
  2. Créer une **OAuth App** sur GitHub (*Settings → Developer settings →
     OAuth Apps → New OAuth App*) avec :
     - **Homepage URL** : l'URL du site (ex. `https://demo-mairie.safe-digitalisation.fr`).
     - **Authorization callback URL** : `<url-du-oauth-worker>/callback`.
  3. Poser les identifiants générés sur le Worker OAuth :
     `wrangler secret put GITHUB_CLIENT_SECRET` (et renseigner
     `GITHUB_CLIENT_ID` dans `oauth-worker/wrangler.jsonc`).
  4. Vérifier que `base_url` dans `public/decap-config.yml` pointe bien vers
     l'URL du Worker OAuth, puis redéployer le site.
  5. Donner accès en écriture au dépôt GitHub aux utilisateurs admin (ils se
     connectent directement sur `/admin.html` avec leur compte GitHub).
- **En production pour une vraie commune (agents publics)**, basculer sur le
  backend GitHub avec ProConnect :

  ```yaml
  backend:
    name: github
    repo: <organisation>/<depot>
    branch: main
    base_url: https://api.proconnect.gouv.fr
    auth_endpoint: /api/v2/authorize
  ```

  Cela nécessite qu'un client OAuth ProConnect soit enregistré pour le
  domaine du site (voir procédure d'onboarding ci-dessous).

## Déploiement (Cloudflare Workers)

Le build (`npm run build`) génère `dist/`, servi tel quel comme assets
statiques par le Worker défini dans `wrangler.jsonc`. Pas de CI à
maintenir pour un déploiement manuel :

1. `wrangler login` (une fois, authentifie la CLI avec le compte
   Cloudflare).
2. `npm run deploy` (build + `wrangler deploy`).
3. Le site est en ligne sur une URL `*.workers.dev` en quelques secondes,
   en HTTPS par défaut. Pour brancher un nom de domaine, ajouter son
   hostname dans `routes` (`wrangler.jsonc`, `custom_domain: true`) puis
   redéployer — Cloudflare crée l'enregistrement DNS et le certificat TLS
   automatiquement (la zone du domaine doit déjà être gérée par Cloudflare).

Pour une intégration continue (déploiement automatique à chaque push), voir
l'action GitHub officielle
[`cloudflare/wrangler-action`](https://github.com/cloudflare/wrangler-action).

## SSL / HTTPS et headers de sécurité

Cloudflare gère automatiquement le certificat TLS pour tout hostname attaché
via `routes`/`custom_domain` dans `wrangler.jsonc`, y compris son
renouvellement — aucune action manuelle après la configuration initiale.

`public/_headers` est lu **nativement** par Cloudflare Workers (assets
statiques) au déploiement, avec la même syntaxe que Netlify : les headers
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy` et `Content-Security-Policy` qui y sont définis sont
appliqués tels quels, sans configuration supplémentaire. C'est ce qui
permet d'atteindre un score [Mozilla Observatory](https://observatory.mozilla.org/)
correct (B- et au-delà) dès le premier déploiement.

## Onboarding d'une nouvelle commune

1. **Créer le dépôt** : dupliquer ce template dans un nouveau dépôt GitHub
   dédié à la commune.
2. **Renseigner les informations de la commune** dans
   `src/content/config.md` (nom, SIREN, nom du maire, adresse, téléphone,
   email, nom de domaine) — ou via l'interface Decap CMS une fois le backend
   configuré.
3. **Adapter le contenu de démo** : horaires (`src/content/horaires.md`),
   actualités (`src/content/actus/`), associations
   (`src/content/associations/`), pages `mairie.astro` (conseil municipal)
   et `vie-locale.astro` (écoles, commerces, collecte des déchets).
4. **Configurer Decap CMS** (`public/decap-config.yml`) : renseigner
   `backend.repo` avec le dépôt de la commune, puis choisir
   l'authentification :
   - **Simple** : backend `github` + Worker proxy OAuth dédié (voir
     « Administration (Decap CMS) » ci-dessus) — dupliquer `oauth-worker/`
     avec un nom distinct pour chaque commune, ou réutiliser un Worker OAuth
     partagé si les admins ont accès au dépôt via la même organisation
     GitHub.
   - **Agents publics (ProConnect)** : garder `base_url` /
     `auth_endpoint` pointés sur ProConnect, en enregistrant un client
     OAuth pour le domaine de la commune.
5. **Déployer sur Cloudflare Workers** (voir « Déploiement » ci-dessus).
6. **Attacher le domaine de la commune** et vérifier l'émission du
   certificat SSL (voir « SSL / HTTPS » ci-dessus).
7. **Vérifier** : navigation complète du site, interface `/admin.html`,
   score Mozilla Observatory ≥ B- sur le domaine final.

## Accessibilité et données personnelles

- Le gabarit `CharteRepublicaine.astro` et l'ensemble des composants visent
  la conformité RGAA 4.1 (structure sémantique, contrastes, focus visible,
  lien d'évitement, `aria-live` sur le bandeau d'urgence, etc.). Toute
  modification de contenu ou de style doit être vérifiée en conséquence.
- Le site ne doit collecter ni stocker aucune donnée personnelle en base ou
  en log applicatif — voir `src/pages/legal/rgpd.astro` pour le détail des
  traitements déclarés.
