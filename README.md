# POAO Frontend

Node.js Express app som håndterer diverse funksjoner som er påkrevd av de fleste frontend applikasjoner.

POAO Frontend integrerer med https://github.com/nais/wonderwall og er avhengig av Wonderwall sidecaren for funksjoner relatert til autentisering.

Forket fra https://github.com/navikt/pto-frontend.

## Konfigurering

Konfigurering av poao-frontend gjøres med JSON. JSON konfigurasjonen kan enten gjøres ved å sette
miljøvariablen **JSON_CONFIG** eller ved å lagre konfigurasjonen i filen **/app/config.json** (kan overskrives med miljøvariablen **JSON_CONFIG_FILE_PATH**).

### Fullt eksempel JSON config

```json
{
  "port": 8080,
  "fallbackStrategy": "SERVE_INDEX_HTML",
  "enableFrontendEnv": false,
  "contextPath": "/",
  "serveFromPath": "/app/public",
  "enableSecureLogs": false,
  "auth": {
    "loginProvider": "ID_PORTEN"
  },
  "cors": {
    "origin": ["nav.no"],
    "credentials": true,
    "maxAge": 7200,
    "allowedHeaders": ["Nav-Consumer-Id"]
  },
  "gcs": {
    "bucketName": "my-bucket",
    "bucketContextPath": "path/to/assets/inside/bucket"
  },
  "header": {
    "csp": {
      "defaultSrc": ["..."],
      "connectSrc":["..."],
      "scriptSrc": ["..."],
      "styleSrc":["..."],
      "imgSrc": ["..."],
      "frameSrc":["..."],
      "fontSrc": ["..."]
    }
  },
  "redirects": [
    {
      "fromPath": "/redirect-path",
      "toUrl": "https://somewhere-else.nav.no",
      "preserveFromPath": false
    }
  ],
  "proxies": [
    {
      "fromPath": "/proxy-path",
      "toUrl": "http://some-application",
      "preserveFromPath": false,
      "toApp": {
        "name": "some-application",
        "namespace": "team",
        "cluster": "dev-gcp"
      }
    }
  ]
}
```

### Base config

### Port

Setter hvilken port poao-frontend skal kjøre på. Default er **8080**.

Eksempel:

```json
{ "port": 8080 }
```

### Fallback strategy

Bestemmer hva som skal skje hvis det blir gjort et request til en ressurs som ikke finnes.

Hvis satt til **REDIRECT_TO_ROOT** så vil forespørsler som til vanlig ville returnert 404 bli redirectet til root path istedenfor.

```
https://my-app.dev.nav.no/not/a/real/path -> Redirected to https://my-app.dev.nav.no
```

Hvis satt til **SERVE_INDEX_HTML** så vil forespørsler som til vanlig ville returnert 404 bli servert index.html.

```
https://my-app.dev.nav.no/not/a/real/path -> Serve index.html on this url
```

Hvis satt til **NONE** så vil forespørsler som gir 404 gi 404 melding tilbake til brukere.

```
https://my-app.dev.nav.no/not/a/real/path -> Return 404-status to user
```

Default er **SERVE_INDEX_HTML**.

Eksempel:

```json
{ "fallbackStrategy": "SERVE_INDEX_HTML" }
```

### Serve from path

Setter hvor poao-frontend skal lete etter statiske filer å serve. Default er **/app/public**.

Eksempel:

```json
{ "serveFromPath": "/app/public" }
```

### Context path

Setter context path for alle paths i poao-frontend. Default er ingen context path ("/").

Eksempel:

```json
{ "contextPath": "/" }
```

### Enable frontend env

Hvis satt til **true** så vil poao-frontend sette opp et endepunkt som returnerer JavaScript.
Scriptet vil inneholde alle miljø variabler som starter med **PUBLIC** og sette det på window-objektet.
F.eks hvis man har en miljøvariabel som heter PUBLIC_MY_APP_URL så vil dette produsere følgende script.

```js
window.env = { MY_APP_URL: "https://my-app.dev.nav.no" };
```

Dette kan brukes med en script tag for å laste inn miljøvariabler før appen starter.

```html
<script src="{CONTEXT_PATH}/env.js"></script>
```

Default er **false**.

Eksempel:

```json
{ "enableFrontendEnv": false }
```

### Enable secure logs
Hvis satt til *true* så vil det logges sensitiv informasjon til secure logs. Kan brukes til f.eks debugging. 
Husk å sette opp secure logs i NAIS-yamlen i tillegg. Default er *false*.

Eksempel:

```json
{ "enableSecureLogs": false }
```

### Auth config

Konfigurering av funksjoner relatert til autentisering.

`loginProvider` kan enten settes til 'ID_PORTEN' eller 'AZURE_AD' basert på hvilken OIDC provider som brukes for å logge inn brukere.
Hvis `loginProvider` er satt så vil tokens fra Wonderwall bli byttet til tokens som er scopet til en gitt applikasjon i proxy-endepunktene.

Eksempel:

```json
{
  "auth": { "loginProvider": "ID_PORTEN" }
}
```

### CORS config

Konfigurering av funksjoner relatert til CORS.

Kontrollerer **Access-Control-Allow-Credentials** som bestemmer om klienter får sende med cookies og authorization header.
Default er **false**

`origin(string | string[])`: hvilket CORS origin som brukes. Hvis ikke satt så vil ikke andre CORS innstillinger bli tatt i bruk. Default er **null**

`credentials`: om det er lov å sende med credentials eller ikke. Default er **true**

`maxAge`: hvor mange sekunder response fra preflight request kan caches. Default er **7200**

`allowedHeaders`: hvilke headere som det er lov å sende med requestet. Default er **undefined** som vil si at alle headere er godkjent.

Eksempel:

```json
{
  "cors": {
    "origin": ["nav.no"],
    "credentials": true,
    "maxAge": 7200,
    "allowedHeaders": ["Nav-Consumer-Id"]
  }
}
```

### GCS config

Konfigurering av funksjoner relatert til GCS (Google Cloud Storage).

`bucketName`: hvis satt så vil poao-frontend servere statiske filer fra GCS.
OBS: Navnet her må være unikt på tvers av GCP. Anbefalt navnekonvensjon er: `<my-app-name>-<dev|prod>`. Default er **null**

`bucketContextPath`: setter context path for hvor filene i GCS skal lastes fra. Default er ingen context path

Eksempel:

```json
{
  "gcs": {
    "bucketName": "my-bucket",
    "bucketContextPath": "path/to/assets/inside/bucket"
  }
}
```

### Header config
Konfigurering av HTTP headers, i første omgang kan kun CSP kan endres.

Hvis hele eller deler av konfigurasjonen ikke er satt så vil det bli brukt 
sane defaults (se header-config.ts) tilpasset "vanlige" applikasjoner på NAV.

De delene av CSP konfigen som blir satt vil overskrive defaultsene, 
så hvis man ønsker å legge til en ny **src** på f.eks `scriptSrc` men fortsatt beholde defaults 
så blir man nødt til å kopiere over defaultsene og legge til **src** på slutten.

Eksempel:

```json
{
  "header": {
    "csp": {
      "defaultSrc": ["..."],
      "connectSrc":["..."],
      "scriptSrc": ["..."],
      "styleSrc":["..."],
      "imgSrc": ["..."],
      "frameSrc":["..."],
      "fontSrc": ["..."]
    }
  }
}
```

### Redirect config

Konfigurering av funksjoner relatert til redirects fra en URL til en annen.

Kan f.eks brukes for å ha lenker til forskjellige tjenester som er forskjellig i hvert miljø (dev/prod).

`fromPath`: hvilken path det skal redirectes fra. Påkrevd felt
`toUrl`: hvilken URL det skal redirectes til. Påkrevd felt
`preserveFromPath`: hvis satt til **true** så vil `fromPath` bli lagt til `toUrl`. 
    Hvis wildcard matching (`/*`) brukes i `fromPath` så vil wildcard delen av pathen alltid bli lagt til på `toUrl`. Default er **false**

Eksempel:

```json
{
  "redirects": [
    {
      "fromPath": "/redirect-path",
      "toUrl": "https://somewhere-else.nav.no",
      "preserveFromPath": false
    }
  ]
}
```

### Proxy config

Konfigurering av funksjoner relatert til proxy endepunkter.

For å sende requests fra frontend til backend med scopet token så kan proxy-funksjonen i brukes.

`fromPath`: hvilken path det skal proxies fra. Påkrevd felt
`toUrl`: hvilken URL det skal proxies til. Påkrevd felt
`preserveFromPath`: hvis satt til **true** så vil `fromPath` bli lagt til `toUrl`. Default er **false**

`toApp`: for å kunne veksle ut token fra Wonderwall med scopet tokens, så må det konfigureres hvilken app som skal motta tokenet. Hvis ikke satt så vil requestet sendes videre uten tokens.

`toApp.name`: navnet til applikasjonen. Påkrevd felt
`toApp.namespace`: namespacet til applikasjonen. Påkrevd felt
`toApp.cluster`: clusteret til applikasjonen. Påkrevd felt

Eksempel:

```json
{
  "proxies": [
    {
      "fromPath": "/proxy-path",
      "toUrl": "http://some-application",
      "preserveFromPath": false,
      "toApp": {
        "name": "some-application",
        "namespace": "team",
        "cluster": "dev-gcp"
      }
    }
  ]
}
```

## Eksempel NAIS-yamler

Eksempel på frontend som leser filer fra GCS og har innlogging med ID-porten og token exchange med TokenX til applikasjonen **some-other-application**

```yaml
apiVersion: "nais.io/v1alpha1"
kind: "Application"
metadata:
  name: my-application
  namespace: my-namespace
  labels:
    team: my-team
spec:
  image: ghcr.io/navikt/poao-frontend/poao-frontend:<latest-version>
  port: 8080
  ingresses:
    - https://my-application.dev.nav.no
  liveness:
    path: /internal/alive
    initialDelay: 10
  readiness:
    path: /internal/ready
    initialDelay: 10
  replicas:
    min: 1
    max: 2
    cpuThresholdPercentage: 75
  resources:
    limits:
      cpu: "1"
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi
  idporten:
    enabled: true
    sidecar:
      enabled: true
  tokenx:
    enabled: true
  gcp:
    buckets:
      - name: my-application-dev
        cascadingDelete: false
  accessPolicy:
    outbound:
      rules:
        - application: some-other-application
          namespace: some-namespace
  env:
    - name: JSON_CONFIG
      value: >
        {
          "gcs": {
            "bucketName": "my-application-dev"
          },
          "auth": {
            "loginProvider": "ID_PORTEN"
          },
          "proxies": [
            {
              "fromPath": "/some-other-application", "toUrl": "http://some-other-application",
              "toApp": { "name": "some-other-application", "namespace": "some-namespace", "cluster": "dev-gcp" }
            }
          ]
        }
```

Eksempel på frontend som leser filer fra GCS og har innlogging og token exchange med Azure AD til applikasjonen **some-other-application**

```yaml
apiVersion: "nais.io/v1alpha1"
kind: "Application"
metadata:
  name: my-application
  namespace: my-namespace
  labels:
    team: my-team
spec:
  image: ghcr.io/navikt/poao-frontend/poao-frontend:<latest-version>
  port: 8080
  ingresses:
    - https://my-application.dev.intern.nav.no
  liveness:
    path: /internal/alive
    initialDelay: 10
  readiness:
    path: /internal/ready
    initialDelay: 10
  replicas:
    min: 1
    max: 2
    cpuThresholdPercentage: 75
  resources:
    limits:
      cpu: "1"
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi
  azure:
    application:
      enabled: true
    sidecar:
      enabled: true
  gcp:
    buckets:
      - name: my-application-dev
        cascadingDelete: false
  accessPolicy:
    outbound:
      rules:
        - application: some-other-application
          namespace: some-namespace
  env:
    - name: JSON_CONFIG
      value: >
        {
          "gcs": {
            "bucketName": "my-application-dev"
          },
          "auth": {
            "loginProvider": "AZURE_AD"
          },
          "proxies": [
            {
              "fromPath": "/some-other-application", "toUrl": "http://some-other-application",
              "toApp": { "name": "some-other-application", "namespace": "some-namespace", "cluster": "dev-gcp" }
            }
          ]
        }
```

## Deploy til GCS

For å kunne laste opp filer til GCS så trenger man en service account på GCP med de riktige tilgangene.
Det er anbefalt å ha 1 service account med 1 nøkkel pr applikasjon slik at det er lettere å rullere nøkkelen uten at alle må oppdateres.

1. Gå til https://console.cloud.google.com/iam-admin/serviceaccounts og velg prosjektet som service accounten skal opprettes i
2. Opprett en service account (i steg 2 i opprettelsen på GCP så velg rollen "Storage Object Admin", dette vil gi tilgang til skriving og sletting/overskriving)
3. Velg accounten som ble opprettet -> trykk på "Keys"-tabben -> trykk "Add key" -> trykk "Create new key" (velg JSON)
4. Opprett en secret på GitHub som heter GCS_SA_KEY_<DEV|PROD> basert på hvilket miljø nøkkelen gjelder sett verdien til hele JSON-nøkkelen

### Eksempel på GH Action worfklow for opplasting til GCS

```yaml
name: Upload files to dev
on:
  workflow_dispatch:
  push:
    branches:
      - main
env:
  CI: true
  TZ: Europe/Amsterdam

jobs:
  upload-files-dev:
    name: Upload files to dev
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Setup node
        uses: actions/setup-node@v2
        with:
          node-version: "16"
          cache: "npm"
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test
      - name: Build application
        run: npm run build
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v0
        with:
          credentials_json: ${{ secrets.GCS_SA_KEY_DEV }}
      - name: Set up gcloud
        uses: google-github-actions/setup-gcloud@v0
      - name: Upload files to GCS
        run: gsutil -m rsync -r build gs://my-application-dev
      - name: Create release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: release/dev@${{ github.sha }}
          release_name: Release to dev
          prerelease: true
```
