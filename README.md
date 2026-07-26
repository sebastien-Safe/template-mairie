# Template Mairie

Template Astro pour sites de mairies rurales françaises, conforme à la charte
républicaine (RGAA 4.1), pensé pour être dupliqué et personnalisé par chaque
commune, et déployé simplement sur Netlify.

## Stack

- [Astro](https://astro.build) v7 — génération de site statique
- HTML/CSS uniquement, sans framework CSS ni JavaScript côté client
  (à l'exception de l'interface d'administration Decap CMS)
- Contenu géré en Markdown (`src/content/`)
- Interface d'édition : [Decap CMS](https://decapcms.org) (`public/admin.html`)
- Hébergement : [Netlify](https://netlify.com) — build et déploiement
  automatiques à chaque push sur `main`, HTTPS géré nativement

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
- **Sur ce dépôt de démo**, le backend est `git-gateway`
  (`public/decap-config.yml` → `backend.name: git-gateway`), qui s'appuie sur
  Netlify Identity + Git Gateway : les modifications faites dans `/admin.html`
  sont réellement commitées sur `main`. Prérequis côté Netlify (à faire une
  fois, dans le dashboard du site) :
  1. **Site settings → Identity → Enable Identity**.
  2. **Identity → Registration** : passer sur *Invite only*.
  3. **Identity → Services → Git Gateway → Enable Git Gateway**.
  4. Inviter les utilisateurs admin depuis l'onglet *Identity* (email
     d'invitation avec lien vers le site, qui redirige ensuite vers
     `/admin.html` — géré par le script dans `CharteRepublicaine.astro`).
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

## Déploiement (Netlify)

Le build est défini dans `netlify.toml` (`npm run build`, publie `dist/`).
Aucune CI à maintenir : une fois le dépôt connecté à Netlify, chaque push
sur `main` déclenche un build et un déploiement automatiques.

1. Sur [app.netlify.com](https://app.netlify.com), **Add new site → Import
   an existing project**, choisir le dépôt GitHub de la commune.
2. Netlify détecte `netlify.toml` automatiquement (commande de build et
   dossier de publication déjà configurés) — valider le déploiement.
3. Le site est en ligne sur une URL `*.netlify.app` en quelques dizaines de
   secondes, en HTTPS par défaut.

## SSL / HTTPS et headers de sécurité

Netlify gère automatiquement le certificat **Let's Encrypt** dès qu'un nom
de domaine personnalisé est attaché au site (**Site settings → Domain
management → Add a domain**), y compris son renouvellement — aucune action
manuelle après la configuration initiale du DNS (CNAME vers le sous-domaine
`*.netlify.app`, ou délégation de zone si domaine apex).

`public/_headers` est lu **nativement** par Netlify au déploiement : les
headers `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
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
4. **Configurer Decap CMS** (`public/decap-config.yml`) : passer
   `backend.name` de `test-repo` à `github`, renseigner `backend.repo`,
   puis choisir l'authentification :
   - **Simple** : activer *Identity* + *Git Gateway* dans les paramètres
     du site Netlify (quelques clics, aucun enregistrement OAuth requis).
   - **Agents publics (ProConnect)** : garder `base_url` /
     `auth_endpoint` pointés sur ProConnect, en enregistrant un client
     OAuth pour le domaine de la commune.
5. **Connecter le dépôt à Netlify** (voir « Déploiement » ci-dessus).
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
