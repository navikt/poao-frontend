import {logger} from "../utils/logger";
import {JsonConfig} from "./app-config-resolver";
import {assert} from "../utils";

const ALLOWED_DOMAINS = ["*.nav.no", "*.adeo.no"];
const GOOGLE_ANALYTICS_DOMAIN = "*.google-analytics.com";
const GOOGLE_TAG_MANAGER_DOMAIN = "*.googletagmanager.com";
const ACCOUNT_PSPLUGIN_DOMAIN = "account.psplugin.com";
const NAV_PSPLUGIN_DOMAIN = "nav.psplugin.com";
const HOTJAR_DOMAIN = "*.hotjar.com";
const VARS_HOTJAR_DOMAIN = "vars.hotjar.com";
const VIDEO_QBRICK_DOMAIN = "video.qbrick.com";

const defaultCspValues = {
  defaultSrc: ["'self'"],
  connectSrc: ["'self'"].concat(
    ALLOWED_DOMAINS,
    GOOGLE_ANALYTICS_DOMAIN,
    NAV_PSPLUGIN_DOMAIN
  ),
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"].concat(
    ALLOWED_DOMAINS,
    GOOGLE_ANALYTICS_DOMAIN,
    GOOGLE_TAG_MANAGER_DOMAIN,
    ACCOUNT_PSPLUGIN_DOMAIN,
    HOTJAR_DOMAIN
  ),
  styleSrc: ["'self'", "https:", "'unsafe-inline'"].concat(ALLOWED_DOMAINS),
  imgSrc: ["'self'", "data:"].concat(ALLOWED_DOMAINS, GOOGLE_ANALYTICS_DOMAIN), // analytics sends information by loading images with query params
  frameSrc: [VARS_HOTJAR_DOMAIN, VIDEO_QBRICK_DOMAIN],
  fontSrc: ["'self'", "https:", "data:"].concat(ALLOWED_DOMAINS),
};

const defaultCorpValues = {
  policy: "same-origin",
} as const;

export interface HeaderConfig {
  csp: {
    defaultSrc: string[];
    connectSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    frameSrc: string[];
    fontSrc: string[];
  };
  corp: {
    policy: "same-origin" | "same-site" | "cross-origin";
  };
}

export function logHeaderConfig(config: HeaderConfig | undefined) {
  if (!config) return;

  logger.info(`Header config: ${JSON.stringify(config)}`);
}

export const resolveHeaderConfig = (
  headerJsonConfig: JsonConfig.HeaderConfig | undefined
): HeaderConfig => {
  const config: Partial<HeaderConfig> = {};

  config.csp = {
    connectSrc:
      headerJsonConfig?.csp?.connectSrc || defaultCspValues.connectSrc,
    defaultSrc:
      headerJsonConfig?.csp?.defaultSrc || defaultCspValues.defaultSrc,
    imgSrc: headerJsonConfig?.csp?.imgSrc || defaultCspValues.imgSrc,
    scriptSrc: headerJsonConfig?.csp?.scriptSrc || defaultCspValues.scriptSrc,
    styleSrc: headerJsonConfig?.csp?.styleSrc || defaultCspValues.styleSrc,
    frameSrc: headerJsonConfig?.csp?.frameSrc || defaultCspValues.frameSrc,
    fontSrc: headerJsonConfig?.csp?.fontSrc || defaultCspValues.fontSrc,
  };

  config.corp = {
    policy: headerJsonConfig?.corp?.policy || defaultCorpValues.policy,
  };

  return validateConfig(config);
};

const validateConfig = (config: Partial<HeaderConfig>): HeaderConfig => {
  assert(config.csp, `Header CSP config is missing`);
  assert(config.corp, `Header CORP config is missing`);
  return config as HeaderConfig;
};
