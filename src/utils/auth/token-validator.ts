import { LoginProviderType } from '../../config/auth-config.js';
import { logger, secureLog } from '../logger.js';
import {validateAzureToken, validateIdportenToken} from "@navikt/oasis";

export enum TokenValidatorType {
	ID_PORTEN, AZURE_AD
}

export function mapLoginProviderTypeToValidatorType(loginProviderType: LoginProviderType): TokenValidatorType {
	switch (loginProviderType) {
		case LoginProviderType.AZURE_AD:
			return TokenValidatorType.AZURE_AD;
		case LoginProviderType.ID_PORTEN:
			return TokenValidatorType.ID_PORTEN;
		default:
            console.log('Unknown loginProviderType ' + loginProviderType)
			throw new Error('Unknown loginProviderType ' + loginProviderType);
	}
}

export function createTokenValidator(loginProviderType: LoginProviderType): TokenValidator {
    const type: TokenValidatorType = mapLoginProviderTypeToValidatorType(loginProviderType);
    const validationFunction = type === TokenValidatorType.AZURE_AD
        ? validateAzureToken
        : validateIdportenToken;
    return {
		isValid: async (token: string | undefined): Promise<boolean> => {
            if (!token) return false;
            const validationResult = await validationFunction(token);
            if (validationResult.ok) {
                return true;
            } else {
                logger.error(`Failed to verify token: ${validationResult.errorType}`, validationResult.error);
                secureLog.error('Failed to verify token: ' + token)
                return false;
            }
		}
	}
}

export interface TokenValidator {
	isValid(token: string | undefined): Promise<boolean>;
}

