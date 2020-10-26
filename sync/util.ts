import { Category } from './generated/readme'

export type RemoteTreeDoc = {
    slug: string;
    children: RemoteTreeDoc[];
}
export type RemoteTreeEntry = { category: Category; docs: RemoteTreeDoc[] }
export type RemoteTree = Map<string, RemoteTreeEntry>

/**
 * Call fn on each element of arr until it returns non-null, then pass
 * that return value back.
 */
function arrayTryEach<E, R>(arr: E[], fn: (t: E) => R | null): R | null {
    for (const elem of arr) {
        const res = fn(elem)
        if (res != null)
            return res
    }
    return null
}

/**
 * Return whether a slug was found in a RemoteTreeEntry
 */
export function findSlugInTree(tree: RemoteTreeEntry, slug: string): RemoteTreeDoc | null {
    function findInDocs(doc: RemoteTreeDoc): RemoteTreeDoc | null {
        if (doc.slug === slug)
            return doc
        else
            return arrayTryEach(doc.children, findInDocs)
    }

    return arrayTryEach(tree.docs, findInDocs)
}

/**
 * Modify the tree to remove a doc and all of it's children, returning the doc
 */
export function removeSlugFromTree(tree: RemoteTreeEntry, slug: string): RemoteTreeDoc | null {
    function remove(doc: RemoteTreeDoc): RemoteTreeDoc | null {
        const index = doc.children.findIndex(doc => doc.slug === slug)
        if (index === -1) {
            return arrayTryEach(doc.children, remove)
        } else {
            return doc.children.splice(index, 1)[0]
        }
    }

    const rootIndex = tree.docs.findIndex(doc => doc.slug === slug)
    if (rootIndex !== -1) {
        return tree.docs.splice(rootIndex, 1)[0]
    } else {
        return arrayTryEach(tree.docs, remove)
    }
}

/**
 * Insert a doc into the tree under a given slug
 * Returns true if successful
 */
export function addDocUnderSlug(tree: RemoteTreeEntry, newDoc: RemoteTreeDoc, parent?: string): boolean {
    function add(doc: RemoteTreeDoc): boolean {
        if (doc.slug === parent) {
            doc.children.push(newDoc)
            return true
        } else {
            return doc.children.some(add)
        }
    }

    if (parent == null) {
        tree.docs.push(newDoc)
        return true
    } else {
        return tree.docs.some(add)
    }
}

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
