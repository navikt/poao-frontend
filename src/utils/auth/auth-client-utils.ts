import { Client, Issuer } from 'openid-client';
import { JWKS } from './auth-config-utils.js';
import { createNbf, OboToken, tokenSetToOboToken } from './auth-token-utils.js';

export async function createIssuer(discoveryUrl: string): Promise<Issuer<Client>> {
	return Issuer.discover(discoveryUrl);
}

export function createClient(issuer: Issuer<Client>, clientId: string, jwks: JWKS): Client {
	return new issuer.Client(
		{
			client_id: clientId,
			token_endpoint_auth_method: 'private_key_jwt',
			token_endpoint_auth_signing_alg: 'RS256',
			response_types: ['code'],
		},
		jwks
	);
}

// Ex: appIdentifier = api://my-cluster.my-namespace.my-app-name/.default
export async function createAzureAdOnBehalfOfToken(
	client: Client,
	appIdentifier: string,
	accessToken: string
): Promise<OboToken> {
	const oboTokenSet = await client.grant(
		{
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
			requested_token_use: 'on_behalf_of',
			scope: appIdentifier,
			assertion: accessToken,
			subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
			subject_token: accessToken,
			audience: appIdentifier,
		},
		{
			clientAssertionPayload: {
				aud: client.issuer.metadata.token_endpoint,
				nbf: createNbf(),
			},
		}
	);

	return tokenSetToOboToken(oboTokenSet);
}

// Its technically not an OBO-token, but for consistency we use the same name as Azure AD.
// appIdentifier=<cluster>:<namespace>:<appname>
export async function createTokenXOnBehalfOfToken(
	client: Client,
	appIdentifier: string,
	accessToken: string,
	clientId: string
): Promise<OboToken> {
	const oboTokenSet = await client.grant(
		{
			grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
			client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
			scope: appIdentifier,
			subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
			subject_token: accessToken,
			audience: appIdentifier,
		},
		{
			clientAssertionPayload: {
				sub: clientId,
				iss: clientId,
				aud: client.issuer.metadata.token_endpoint,
				nbf: createNbf(),
			},
		}
	);

	return tokenSetToOboToken(oboTokenSet);
}

export const createScope = (scopes: (string | undefined | null)[]): string => {
	return scopes.filter(s => !!s).join(' ');
};
