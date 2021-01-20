# pto-frontend
Node.js Express app som håndterer diverse funksjoner som er påkrevd av de fleste frontend applikasjoner.

## Hvordan ta i bruk
Kopier filene som skal serveres til /app/public.

```dockerfile
FROM docker.pkg.github.com/navikt/pto-frontend/pto-frontend:IMAGE_VERSION
COPY build /app/public
```

## Konfigurering
All konfigurering av pto-frontend gjøres gjennom miljø variabler.


### PORT
Setter hvilken port pto-frontend skal kjøre på. Default er **8080**.
Eksempel: `PORT=8081`

### SERVE_FROM_PATH
Setter hvor pto-frontend skal lete etter statiske filer. Default er **/app/public**.
Eksempel: `SERVE_FROM_PATH=/some/path`

### GCS_BUCKET_NAME
Navnet til en GCS bøtte som pto-frontend skal servere filer fra. Hvis GCS_BUCKET_NAME er satt så vil dette overskrive servering av lokale filer.
Eksempel: GCS_BUCKET_NAME=behovsvurdering-dev` (navn må være unike på tvers av hele Google sin infrastruktur så det må skilles på dev/prod)

### GCS_BUCKET_CONTEXT_PATH
Setter context path for servering av filer fra en GCS bøtte. Kan brukes hvis man skal servere filer som ikke ligger i root av bøtten (/).
Eksempel: `GCS_BUCKET_CONTEXT_PATH=build`

### CONTEXT_PATH
Setter context path for alle paths i pto-frontend. Default er ingen context path.

### FALLBACK_STRATEGY
Hvis satt til **redirect** så vil forespørsler som gir 404 bli redirectet til root path.
Hvis satt til **serve** så vil forespørsler som gir 404 bli servert index.html.
Hvis satt til **none** så vil forespørsler som gir 404 gi 404 melding tilbake til brukere.
Default er **redirect**.

REDIRECT_ON_NOT_FOUND=redirect
```
https://my-app.dev.nav.no/not/a/real/path -> Redirected to https://my-app.dev.nav.no
```

REDIRECT_ON_NOT_FOUND=serve
```
https://my-app.dev.nav.no/not/a/real/path -> Serve index.html on this url
```

REDIRECT_ON_NOT_FOUND=none
```
https://my-app.dev.nav.no/not/a/real/path -> Return 404-message to user
```

### CORS_DOMAIN
Skru på CORS for spesifisert domene. Default er at CORS er skrudd av for alle domener.

Eksempel: `CORS_DOMAIN=*` eller `CORS_DOMAIN=nav.no`

### CORS_ALLOW_CREDENTIALS
Kontrollerer **Access-Control-Allow-Credentials** som bestemmer om klienter får sende med cookies og authorization header.
Default er **false**

Eksempel: `CORS_ALLOW_CREDENTIALS=true` 

### JSON_CONFIG_FILE_PATH
pto-frontend vil sjekke på JSON_CONFIG_FILE_PATH etter en JSON-fil som inneholder config for å sette opp serveren.
Hvis ingen config fil er tilgjengelig så pto-frontend kjøre uten
Default er **/app/config/config.json**.

Hvis man lager et configmap med configen til pto-frontend, så kan man injecte det som en fil i nais-yamlen.
```bash
kubectl create configmap my-app-config -n <team-namespace> --from-file=./config.json
```
```yaml
filesFrom:
    - configmap: my-app-config
      mountPath: /app/config
```

### JSON_CONFIG
Hvis satt så vil pto-frontend hente configen herfra istedenfor å lete etter en JSON-fil på JSON_CONFIG_FILE_PATH.

Kan for eksempel brukes slik i en nais-yaml fil.
```yaml
      env:
        - name: CONFIG_JSON
          value: >
            {
              "proxies": [...]
            }
```

### ENABLE_FRONTEND_ENV
Hvis satt til **true** så vil pto-frontend lage en **env.js** som blir plassert i SERVE_FROM_PATH.
Denne filen vil inneholde alle miljø variabler som starter med PUBLIC og sette det på window.
Default er **false**.

F.eks hvis man har en variabel som heter PUBLIC_MY_APP_URL så vil dette produsere følgende **env.js** fil.

```js
window.env = {MY_APP_URL: 'https://my-app.dev.nav.no'};
```

Dette kan brukes med en script tag for å laste inn miljøvariabler før appen starter.

```html
<script src="{CONTEXT_PATH}/env.js"></script>
```

### ENFORCE_LOGIN
Hvis satt til **true** så vil pto-frontend validere tokenet til bruker for alle forespørsler. 
Default er **false**.

Hvis ENFORCE_LOGIN er på så må også variblene LOGIN_REDIRECT_URL, OIDC_DISCOVERY_URL, OIDC_CLIENT_ID, TOKEN_COOKIE_NAME settes.

#### LOGIN_REDIRECT_URL
Hvor skal brukeren sendes hvis de ikke har et gyldig token.
Denne URLen burde inneholde **{RETURN_TO_URL}** som vil bli byttet ut med URLen som brukeren var på før de ble sendt videre for innlogging.

Eksempel: LOGIN_REDIRECT_URL=https://loginservice.dev.nav.no/login?redirect={RETURN_TO_URL}&level=Level4`

#### OIDC_DISCOVERY_URL
URL som peker til discovery endepunktet for en OIDC provider. Brukes for å hente JWKS URI og issuer.

#### OIDC_CLIENT_ID
En klient id som brukes for å verifisere at tokenet kan brukes i appen din.

#### TOKEN_COOKIE_NAME
Navnet på cookien som inneholder tokenet til bruker.

## JSON config
Det er mulig å bruke JSON til å representere configen til pto-frontend. Alt som kan konfigureres med miljøvariabler kan også konfigureres med JSON.
I tillegg så kan JSON også konfigurere ting som proxy, som ikke kan konfigureres med miljøvariabler.
Konfigen kan enten leses som en fil fra JSON_CONFIG_FILE_PATH eller som en miljøvariabel med JSON_CONFIG.

Eksempel config med alle felt satt:
```json
{
  "port": 8080,
  "serveFromPath": "/app/public",
  "contextPath": "",
  "gcsBucketName": "demo-app",
  "gcsBucketContextPath": "/build",
  "corsDomain": "*",
  "corsAllowCredentials": false,
  "fallbackStrategy": "redirect",
  "enableFrontendEnv": false,
  "enforceLogin": false,
  "loginRedirectUrl": "https://some.domain.com/path",
  "oidcDiscoveryUrl": "https://some.domain.com/path",
  "oidcClientId": "abc123efg456",
  "tokenCookieName": "selvbetjening-idtoken",
  "proxies": [
    {
      "from": "/dekorator",
      "to": "https://dekoratoren.dev.nav.no",
      "preserveContextPath": false
    },
    {
      "from": "/proxy",
      "to": "https://pto-proxy.dev.nav.no"
    }  
  ]
}
```

## Eksempel på konfigurasjon

Her er noen eksempler på konfigurasjoner som kan bli brukt.

Konfigurasjon med NAV dekoratør proxy, miljø variabler i frontend og login med redirect for eksterne brukere i testmiljøet.
```
CONFIG_JSON={ "proxies": [ { "from": "/dekorator", "to": "https://dekoratoren.dev.nav.no" } ] }
ENABLE_FRONTEND_ENV=true
ENFORCE_LOGIN=true
LOGIN_REDIRECT_URL=https://loginservice.dev.nav.no/login?redirect={RETURN_TO_URL}&level=Level4
OIDC_DISCOVERY_URL=https://login.microsoftonline.com/NAVtestB2C.onmicrosoft.com/v2.0/.well-known/openid-configuration?p=B2C_1A_idporten_ver1
OIDC_CLIENT_ID=0090b6e1-ffcc-4c37-bc21-049f7d1f0fe5
TOKEN_COOKIE_NAME=selvbetjening-idtoken
```

Konfigurasjon med NAV dekoratør proxy, miljø variabler i frontend og login med redirect for eksterne brukere i produkjson.
```
CONFIG_JSON={ "proxies": [ { "from": "/dekorator", "to": "https://www.nav.no/dekoratoren" } ] }
ENABLE_FRONTEND_ENV=true
ENFORCE_LOGIN=true
LOGIN_REDIRECT_URL=https://loginservice.nav.no/login?redirect={RETURN_TO_URL}&level=Level4
OIDC_DISCOVERY_URL=https://login.microsoftonline.com/navnob2c.onmicrosoft.com/v2.0/.well-known/openid-configuration?p=B2C_1A_idporten
OIDC_CLIENT_ID=45104d6a-f5bc-4e8c-b352-4bbfc9381f25
TOKEN_COOKIE_NAME=selvbetjening-idtoken
```
