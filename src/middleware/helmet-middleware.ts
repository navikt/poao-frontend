import helmet from 'helmet';

const ALLOWED_DOMAINS = ["*.nav.no", "*.adeo.no"];
const GOOGLE_ANALYTICS_DOMAIN = "*.google-analytics.com";
const GOOGLE_TAG_MANAGER_DOMAIN = "*.googletagmanager.com";
const ACCOUNT_PSPLUGIN_DOMAIN = "account.psplugin.com";
const STATIC_HOTJAR_DOMAIN = "static.hotjar.com";

/**
 * Det hadde vært best å fjerne 'unsafe-inline' fra scriptSrc, men NAV dekoratøren kjører inline scripts som ikke vil fungere uten dette.
 * Denne reglen vil også treffe applikasjoner som bruker create-react-app siden den lager et inline script for å bootstrape appen.
 * Dette kan fikses med å sette "INLINE_RUNTIME_CHUNK=false" i en .env fil.
 */

export function helmetMiddleware() {
	return helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				connectSrc: ["'self'"].concat(ALLOWED_DOMAINS),
				baseUri: ["'self'"],
				blockAllMixedContent: [],
				fontSrc: ["'self'", "https:", "data:"].concat(ALLOWED_DOMAINS),
				frameAncestors: ["'self'"],
				objectSrc: ["'none'"],
				scriptSrc: ["'self'", "'unsafe-inline'"].concat(
					ALLOWED_DOMAINS, GOOGLE_ANALYTICS_DOMAIN,
					GOOGLE_TAG_MANAGER_DOMAIN, ACCOUNT_PSPLUGIN_DOMAIN, STATIC_HOTJAR_DOMAIN
				),
				scriptSrcAttr: ["'none'"],
				styleSrc: ["'self'", "https:", "'unsafe-inline'"].concat(ALLOWED_DOMAINS),
				imgSrc: ["'self'", "data:"].concat(ALLOWED_DOMAINS, GOOGLE_ANALYTICS_DOMAIN), // analytics sends information by loading images with query params
				upgradeInsecureRequests: []
			}
		}
	});
}

