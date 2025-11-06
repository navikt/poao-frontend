import { requestTokenxOboToken, requestAzureOboToken } from '@navikt/oasis'

// Ex: appIdentifier = api://my-cluster.my-namespace.my-app-name/.default
export async function createAzureAdOnBehalfOfToken(
	appIdentifier: string,
	accessToken: string
): Promise<string> {
    return requestAzureOboToken(
        accessToken,
        appIdentifier
    ).then((result) => {
        if (result.ok) {
            return result.token
        } else {
            throw new Error("Could not fetch Entra OBO token")
        }
    })
}

// Its technically not an OBO-token, but for consistency we use the same name as Azure AD.
// appIdentifier=<cluster>:<namespace>:<appname>
export async function createTokenXOnBehalfOfToken(
	appIdentifier: string,
	accessToken: string,
): Promise<string> {
    return requestTokenxOboToken(
        accessToken,
        appIdentifier
    ).then((result) => {
        if (result.ok) {
            return result.token
        } else {
            throw Error("Could not fetch tokenX OBO token")
        }
    })
}

export const createScope = (scopes: (string | undefined | null)[]): string => {
	return scopes.filter(s => !!s).join(' ');
};
