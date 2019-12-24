export function slugify(name: string) {
    return name.toLowerCase().replace(/ /g, '-')
}