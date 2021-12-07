export interface JWKS {
	keys: [
		{
			kty: 'oct';
		}
	];
}

interface NaisApp {
	cluster: string;
	namespace: string;
	name: string;
}

export const createAzureAdAppId = (app: NaisApp): string => {
	return `api://${app.cluster}.${app.namespace}.${app.name}/.default`;
};

export const createTokenXAppId = (app: NaisApp): string => {
	return `${app.cluster}:${app.namespace}:${app.name}`;
};

export const createJWKS = (jwkJson: string): JWKS => {
	const jwk = JSON.parse(jwkJson);

	// UnhandledPromiseRejectionWarning: JWKInvalid: `x5c` member at index 0 is not a valid base64-encoded DER PKIX certificate
	delete jwk.x5c;

	return {
		keys: [jwk],
	};
};

