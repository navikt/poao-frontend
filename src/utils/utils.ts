import mime from 'mime-types';
import {extname} from "path";

export function hoursToMs(hours: number): number {
    return hours * 60 * 60 * 1000;
}

export function hoursToSeconds(hours: number): number {
    return hours * 60 * 60;
}

export function minutesToSeconds(minutes: number): number {
    return minutes * 60;
}

/*
	Checks if the request path references a file such as /path/to/img.png
	Ex:
		/path/to/img.png -> true
		/path/to/img.png?hello=world -> true
		/path/to/something -> false
 */
export function isRequestingFile(requestPath: string): boolean {
    return !!mime.lookup(extname(removeQueryParams(requestPath)));
}

export function removeQueryParams(requestPath: string): string {
    const queryParamStart = requestPath.indexOf('?');
    return queryParamStart >= 0 ? requestPath.substring(0, queryParamStart) : requestPath;
}

export function getMimeType(path: string): string {
    return mime.lookup(extname(path)) || 'application/octet-stream';
}

export function stripPrefix(sourceStr: string, prefixToStrip: string): string {
    if (sourceStr.startsWith(prefixToStrip)) {
        return sourceStr.substring(prefixToStrip.length);
    }

    return sourceStr;
}

export function fromBase64(base64Str: string): string {
    return Buffer.from(base64Str, 'base64').toString('utf8');
}

/**
 * Erstatter tidligere bruk av `url-join`.
 * Kobler sammen en base og en sti uten å normalisere `.` eller `..`.
 * Funksjonen fjerner bare ekstra skråstreker der basen og stien møtes.
 */
export function joinUrlPath(base: string, path: string): string {
    // Fjern én eller flere skråstreker på slutten av basen.
    const baseWithoutTrailingSlashes = base.replace(/\/+$/, '');
    // Fjern én eller flere skråstreker på starten av stien.
    const pathWithoutLeadingSlashes = path.replace(/^\/+/, '');

    // Behold én innledende skråstrek når basen bare består av skråstreker.
    if (baseWithoutTrailingSlashes === '') {
        const leadingSlash = base.startsWith('/') || path.startsWith('/') ? '/' : '';
        return `${leadingSlash}${pathWithoutLeadingSlashes}`;
    }

    // Tom sti gir ingen skråstrek, mens en sti med bare skråstreker gir én.
    const separator = path === '' ? '' : '/';
    return `${baseWithoutTrailingSlashes}${separator}${pathWithoutLeadingSlashes}`;
}

export const routeUrl = ({path, contextPath}: { path: string, contextPath: string }): string => {
    const pathWithNamedWildcard = path.endsWith('/*') ? path.replace('/*', '/*path') : path;
    return joinUrlPath(contextPath, pathWithNamedWildcard);
};
