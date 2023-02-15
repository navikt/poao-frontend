import {JsonConfig} from "./app-config-resolver";
import DekoratorConfig = JsonConfig.DekoratorConfig;

export const resolveDekoratorConfig = (dekoratorConfig: JsonConfig.DekoratorConfig | undefined): DekoratorConfig | undefined => {
    if (!dekoratorConfig) return undefined
    validateDekoratorConfig(dekoratorConfig);
    return {
        simple: valueOrDefault(dekoratorConfig.simple, true),
        chatbot: valueOrDefault(dekoratorConfig.chatbot, false),
        env: dekoratorConfig.env
    }
};

const validateDekoratorConfig = (config: Partial<DekoratorConfig>) => {
    if (config.env !== 'prod' && config.env !== 'dev')
        throw new Error(`The field 'env' must be either prod or dev: ${JSON.stringify(config)}`);
}

const valueOrDefault = <T>(value: T | undefined | null, defaultValue: T) => {
    if (value === undefined || value === null) return defaultValue
    return value
}
