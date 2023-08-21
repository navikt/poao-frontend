import { getFnrFromPath, getPathWithoutFnr } from "../utils/modiacontextholder/modiaContextHolderUtils";

const testFnr = "12345678901"
describe('getFnrFromPath', () => {
    it('/ should not return fnr', () => {
        expect(getFnrFromPath({ path: "/" } as any)).toBe(undefined)
    })
    it('should not return fnr empty string', () => {
        expect(getFnrFromPath({ path: "" } as any)).toBe(undefined)
    })
    it(':fnr/asdf should return fnr', () => {
        expect(getFnrFromPath({ path: `${testFnr}/asdf` } as any)).toBe(testFnr)
    })
    it('/:fnr/asdf should return fnr', () => {
        expect(getFnrFromPath({ path: `/${testFnr}/asdf/asdas` } as any)).toBe(testFnr)
    })
    it('/asdf/:fnr should not return fnr', () => {
        expect(getFnrFromPath({ path: `/asdf/${testFnr}` } as any)).toBe(undefined)
    })
});

describe('getPathWithoutFnr', () => {
    it('/:fnr/asdf should handle starting with /', () => {
        expect(getPathWithoutFnr({ path: `/${testFnr}/first/second` } as any, testFnr)).toBe("/first/second")
    })
    it('/:fnr should handle starting with /', () => {
        expect(getPathWithoutFnr({ path: `/${testFnr}` } as any, testFnr)).toBe("/")
    })
})
