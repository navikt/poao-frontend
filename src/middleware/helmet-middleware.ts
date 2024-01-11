import helmet from "helmet";
import { HeaderConfig } from "../config/header-config.js";

/**
 * Det hadde vært best å fjerne 'unsafe-inline' fra scriptSrc, men NAV dekoratøren kjører inline scripts som ikke vil fungere uten dette.
 * Denne reglen vil også treffe applikasjoner som bruker create-react-app siden den lager et inline script for å bootstrape appen.
 * Dette kan fikses med å sette "INLINE_RUNTIME_CHUNK=false" i en .env fil.
 *
 * unsafe-eval i scriptSrc blir brukt av account.psplugin.com. Hvis vi ikke trenger psplugin så bør dette fjernes.
 */

export function helmetMiddleware(headerConfig: HeaderConfig) {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: headerConfig.csp.defaultSrc,
        connectSrc: headerConfig.csp.connectSrc,
        baseUri: ["'self'"],
        blockAllMixedContent: [],
        fontSrc: headerConfig.csp.fontSrc,
        frameAncestors: ["'self'"],
        frameSrc: headerConfig.csp.frameSrc,
        objectSrc: ["'none'"],
        scriptSrc: headerConfig.csp.scriptSrc,
        scriptSrcAttr: ["'none'"],
        styleSrc: headerConfig.csp.styleSrc,
        imgSrc: headerConfig.csp.imgSrc,
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: {
      policy: headerConfig.corp.policy,
    },
  });
}
