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
			throw new Error('Unknown loginProviderType ' + loginProviderType);
	}
}

export async function createTokenValidator(type: TokenValidatorType): Promise<TokenValidator> {
	return {
		isValid: async (token: string | undefined): Promise<boolean> => {
			if (!token) return false;
            const validationResult = type === TokenValidatorType.AZURE_AD ? await validateAzureToken(token) : await validateIdportenToken(token);
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

