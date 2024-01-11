import { existsSync, readFileSync } from "fs";

import { AuthConfig, logAuthConfig, resolveAuthConfig } from "./auth-config.js";
import { BaseConfig, logBaseConfig, resolveBaseConfig } from "./base-config.js";
import { CorsConfig, logCorsConfig, resolveCorsConfig } from "./cors-config.js";
import { ProxyConfig, logProxyConfig, resolveProxyConfig } from "./proxy-config.js";
import {
  RedirectConfig,
  logRedirectConfig,
  resolveRedirectConfig,
} from "./redirect-config.js";
import { GcsConfig, logGcsConfig, resolveGcsConfig } from "./gcs-config.js";
import { parseJSONwithSubstitutions } from "../utils/config-utils.js";
import {
  HeaderConfig,
  logHeaderConfig,
  resolveHeaderConfig,
} from "./header-config.js";
import { resolveDekoratorConfig } from "./dekorator-config.js";

export interface AppConfig {
  base: BaseConfig;
  auth?: AuthConfig;
  gcs?: GcsConfig;
  cors: CorsConfig;
  proxy: ProxyConfig;
  redirect: RedirectConfig;
  header: HeaderConfig;
  dekorator?: JsonConfig.DekoratorConfig;
}

const DEFAULT_JSON_CONFIG_FILE_PATH = "/app/config.json";

export function createAppConfig(): AppConfig {
  const jsonConfigStr = resolveJsonConfigStr();

  const jsonData = jsonConfigStr
    ? (parseJSONwithSubstitutions(jsonConfigStr) as JsonConfig.Config)
    : undefined;

  return {
    base: resolveBaseConfig(jsonData),
    auth: resolveAuthConfig(jsonData?.auth),
    cors: resolveCorsConfig(jsonData?.cors),
    gcs: resolveGcsConfig(jsonData?.gcs),
    header: resolveHeaderConfig(jsonData?.header),
    proxy: resolveProxyConfig(jsonData?.proxies),
    redirect: resolveRedirectConfig(jsonData?.redirects),
    dekorator: resolveDekoratorConfig(jsonData?.dekorator),
  };
}

export function logAppConfig(config: AppConfig): void {
  logBaseConfig(config.base);
  logAuthConfig(config.auth);
  logCorsConfig(config.cors);
  logGcsConfig(config.gcs);
  logHeaderConfig(config.header);
  logProxyConfig(config.proxy);
  logRedirectConfig(config.redirect);
}

function resolveJsonConfigStr(): string | undefined {
  const jsonConfigEnv = process.env.JSON_CONFIG;

  if (jsonConfigEnv) {
    return jsonConfigEnv;
  }

  const jsonConfigFilePath =
    process.env.JSON_CONFIG_FILE_PATH || DEFAULT_JSON_CONFIG_FILE_PATH;

  return readConfigFile(jsonConfigFilePath);
}

function readConfigFile(configFilePath: string): string | undefined {
  if (!existsSync(configFilePath)) return undefined;
  return readFileSync(configFilePath).toString();
}

export namespace JsonConfig {
  export interface Config {
    port?: number;
    fallbackStrategy?: string;
    enableFrontendEnv?: boolean;
    contextPath?: string;
    serveFromPath?: string;
    enableSecureLogs?: boolean;
    dekorator?: DekoratorConfig;
    enableModiaContextUpdater: ModiaContextHolderConfig;
    auth?: AuthConfig;
    cors?: CorsConfig;
    gcs?: GcsConfig;
    header?: HeaderConfig;
    redirects?: Redirect[];
    proxies?: Proxy[];
  }

  export interface AuthConfig {
    loginProvider?: string;
  }

  export interface CorsConfig {
    origin?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    allowedHeaders?: string[];
  }

  export interface GcsConfig {
    bucketName?: string;
    bucketContextPath?: string;
  }

  export interface DekoratorConfig {
    env: "prod" | "dev";
    simple: boolean;
    chatbot: boolean;
  }

  export interface ModiaContextHolderConfig {
    url: string;
    scope: string;
  }

  export interface HeaderConfig {
    csp?: {
      defaultSrc?: string[];
      connectSrc?: string[];
      scriptSrc?: string[];
      imgSrc?: string[];
      styleSrc?: string[];
      frameSrc?: string[];
      fontSrc?: string[];
    };
    corp?: {
      policy?: "same-origin" | "same-site" | "cross-origin";
    };
  }

  export interface Proxy {
    fromPath?: string;
    toUrl?: string;
    preserveFromPath?: boolean;
    toApp?: {
      name?: string;
      namespace?: string;
      cluster?: string;
    };
  }

  export interface Redirect {
    fromPath?: string;
    toUrl?: string;
    preserveFromPath?: boolean;
  }
}
