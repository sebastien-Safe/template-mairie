# Template Mairie

Template Astro pour sites de mairies rurales françaises, conforme à la charte
républicaine (RGAA 4.1) et pensé pour un déploiement rapide sur Scaleway
Object Storage (Scaleway fr-par).

Démo : https://mairies-template.s3.fr-par.scw.cloud/index.html

## Stack

- [Astro](https://astro.build) v7 — génération de site statique
- HTML/CSS uniquement, sans framework CSS ni JavaScript côté client
  (à l'exception de l'interface d'administration Decap CMS)
- Contenu géré en Markdown (`src/content/`)
- Interface d'édition : [Decap CMS](https://decapcms.org) (`public/admin.html`)
- Hébergement : Scaleway Object Storage, déploiement via GitHub Actions

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

- **En démo / test**, le backend est configuré sur `test-repo`
  (`public/decap-config.yml` → `backend.name: test-repo`) : l'interface
  fonctionne sans authentification, avec des données stockées uniquement en
  mémoire dans le navigateur (rien n'est écrit sur GitHub). C'est le mode à
  utiliser pour valider l'interface avant de la connecter à un vrai dépôt.
- **En production**, basculer sur le backend GitHub avec ProConnect :

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

## Déploiement (CI/CD)

Le déploiement est automatique via `.github/workflows/deploy.yml` : chaque
push sur `main` build le site puis le synchronise sur un bucket Scaleway
Object Storage (`s3-sync-action`). Secrets GitHub requis sur le dépôt :

| Secret | Description |
| --- | --- |
| `SCW_BUCKET_NAME` | Nom du bucket Object Storage |
| `SCW_ACCESS_KEY` | Clé d'accès Scaleway (IAM) |
| `SCW_SECRET_KEY` | Clé secrète associée |

## SSL / HTTPS

Scaleway Object Storage en mode "site web statique" (`s3-website.fr-par.scw.cloud`)
ne fournit **pas** de certificat SSL sur les domaines personnalisés pointés
en CNAME. Pour servir un site en HTTPS sur le domaine de la commune
(ex. `saint-marcel-en-dombes.collectivite.fr`), il faut placer
**Scaleway Edge Services** devant le bucket :

1. Dans la console Scaleway, créer un pipeline **Edge Services** avec le
   bucket Object Storage du site comme origine (backend).
2. Attacher le nom de domaine de la commune au pipeline Edge Services.
3. Activer le certificat **Let's Encrypt géré automatiquement** par Edge
   Services pour ce domaine (renouvellement automatique, aucune action
   manuelle ensuite).
4. Mettre à jour le CNAME DNS du domaine de la commune pour qu'il pointe
   vers l'endpoint Edge Services fourni (et non plus directement vers
   `*.s3-website.fr-par.scw.cloud`).
5. Vérifier la propagation DNS puis l'émission du certificat (quelques
   minutes à quelques heures selon le TTL du DNS).

C'est aussi Edge Services qui doit être utilisé pour appliquer les headers
de sécurité (voir section suivante) : le stockage objet seul ne les sert pas.

## Headers de sécurité

`public/_headers` définit les headers attendus (`X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Content-Security-Policy`) au format Netlify/Cloudflare Pages.

**Important** : Scaleway Object Storage en hébergement statique ne lit pas
ce fichier nativement — c'est une convention propre aux plateformes de
type Netlify/Cloudflare Pages. Pour que ces headers soient réellement
envoyés au navigateur, ils doivent être configurés au niveau de
**Scaleway Edge Services** (règles de réponse HTTP / rules engine), en
front du bucket. Sans cette couche, `public/_headers` reste un fichier de
référence documentant la politique attendue, mais n'a aucun effet sur les
réponses HTTP réelles — l'objectif "Mozilla Observatory ≥ A" ne peut être
atteint qu'une fois Edge Services configuré avec ces règles.

## Onboarding d'une nouvelle commune

1. **Créer le dépôt** : dupliquer ce template dans un nouveau dépôt GitHub
   dédié à la commune.
2. **Renseigner les informations de la commune** dans
   `src/content/config.md` (nom, SIREN, nom du maire, adresse, téléphone,
   email, nom de domaine) — ou via l'interface Decap CMS une fois le backend
   GitHub configuré.
3. **Adapter le contenu de démo** : horaires (`src/content/horaires.md`),
   actualités (`src/content/actus/`), associations
   (`src/content/associations/`), pages `mairie.astro` (conseil municipal)
   et `vie-locale.astro` (écoles, commerces, collecte des déchets).
4. **Configurer Decap CMS** (`public/decap-config.yml`) :
   - passer `backend.name` de `test-repo` à `github`
   - renseigner `backend.repo` avec `<organisation>/<depot-de-la-commune>`
   - enregistrer un client OAuth ProConnect pour le domaine de la commune et
     vérifier `base_url` / `auth_endpoint`
5. **Créer le bucket Scaleway Object Storage** (région `fr-par`) dédié à la
   commune, et une clé IAM avec les droits d'écriture sur ce bucket.
6. **Configurer les secrets GitHub Actions** du nouveau dépôt :
   `SCW_BUCKET_NAME`, `SCW_ACCESS_KEY`, `SCW_SECRET_KEY`.
7. **Déclencher un premier déploiement** (push sur `main`) et vérifier que
   le site est bien accessible via l'URL du bucket.
8. **Configurer le domaine et le SSL** : suivre la procédure « SSL / HTTPS »
   ci-dessus (Scaleway Edge Services + Let's Encrypt + headers de sécurité),
   puis mettre à jour le CNAME du domaine de la commune.
9. **Vérifier** : navigation complète du site, interface `/admin.html`,
   score [Mozilla Observatory](https://observatory.mozilla.org/) ≥ A sur le
   domaine final.

## Accessibilité et données personnelles

- Le gabarit `CharteRepublicaine.astro` et l'ensemble des composants visent
  la conformité RGAA 4.1 (structure sémantique, contrastes, focus visible,
  lien d'évitement, `aria-live` sur le bandeau d'urgence, etc.). Toute
  modification de contenu ou de style doit être vérifiée en conséquence.
- Le site ne doit collecter ni stocker aucune donnée personnelle en base ou
  en log applicatif — voir `src/pages/legal/rgpd.astro` pour le détail des
  traitements déclarés.
