import { parseJSONwithSubstitutions } from "./json-utils.js";

describe('parseJSONwithSubstitutions', () => {
    it('json parse with substituteEnvVariables', () => {
        process.env.JSON_CONFIG = `
            {
                "redirects": [
                    {
                    "from": "/api/auth",
                    "to": "/auth/info"
                    },
                    {
                    "from": "/path1",
                    "to": "{{PATH1_URL}}"
                    },
                    {
                    "from": "/path2",
                    "to": "{{PATH2_URL}}"
                    }
                ]
            }`
        process.env.PATH1_URL = 'https://test.nav.no/';
        process.env.PATH2_URL = 'https://testtest.nav.no/';
        const parsedJSON = parseJSONwithSubstitutions(process.env.JSON_CONFIG);
        expect(parsedJSON['redirects'][0].to).toBe('/auth/info');
        expect(parsedJSON['redirects'][1].to).toBe('https://test.nav.no/');
        expect(parsedJSON['redirects'][2].to).toBe('https://testtest.nav.no/');
    });
});
