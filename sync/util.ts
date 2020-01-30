export function slugify(name: string): string {
    return name.toLowerCase().replace(/[^A-Za-z0-9-]/g, '-').replace(/--+/g, '-')
}

function parseNameWithOrder(name: string): {name: string; order?: number} {
    const match = name.match(/^(\d+) - (.+)/)
    if (match != null)
        return {
            order: parseInt(match[1]),
            name: match[2],
        }
    else
        return {
            order: undefined,
            name,
        }
}

export function nameWithoutOrder(name: string): string {
    return parseNameWithOrder(name).name
}

export function orderFromName(name: string): number | undefined {
    return parseNameWithOrder(name).order
}