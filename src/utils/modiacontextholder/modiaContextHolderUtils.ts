import { Request } from "express";

const has11Digits = (pathPart: string | undefined) => pathPart?.length == 11 && !isNaN(parseInt(pathPart))
export const getFnrFromPath = (req: Request) => {
    const pathParts = req.path.split("/")
        .filter(pathPart => pathPart !== "")
    const firstMatch = pathParts[0]
    return has11Digits(firstMatch) ? firstMatch : undefined
}

export const getPathWithoutFnr = (req: Request, fnr: string): string => {
    const path = req.path.replace(`/${fnr}`, '')
    return path.length === 0 ? "/" : path
}