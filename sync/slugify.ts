export function slugify(name: string): string {
    return name.toLowerCase().replace(/[^A-Za-z0-9-]/g, '-').replace(/--+/g, '-')
}