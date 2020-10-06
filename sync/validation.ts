import fs from 'fs'
import path from 'path'
import { redBright, green, underline, blueBright } from 'chalk'
import matter from 'gray-matter'
import { slugify, nameWithoutOrder } from './util'

const CATEGORY_LEVEL = 0
const PAGE_LEVEL = 1
const SUBPAGE_LEVEL = 2

function walkDocTree(
    root: string,
    cb: (filepath: string, level: number, stat: fs.Stats) => boolean,
    level = 0,
): boolean {
    let pass = true

    for (const node of fs.readdirSync(root)) {
        if (node.startsWith('.'))
            continue

        const fullpath = path.join(root, node)
        const stat = fs.lstatSync(fullpath)
        const valid = cb(fullpath, level, stat)
        if (!valid)
            pass = false

        if (stat.isDirectory()) {
            const validSubtree = walkDocTree(fullpath, cb, level + 1)
            if (!validSubtree)
                pass = false
        }

    }

    return pass
}

export function ensureNoWeirdFiles(root: string): boolean {
    return walkDocTree(root, (filepath, level, stat) => {
        if (stat.isFile()) {
            if (filepath.endsWith('.md'))
                return true

            console.error(`Stray file at ${filepath}. All files are expected to end in .md`)
            return false
        }

        if (stat.isDirectory())
            return true

        const type =
            stat.isFile() ? 'file'
                : stat.isDirectory() ? 'directory'
                    : stat.isBlockDevice() ? 'block device'
                        : stat.isCharacterDevice() ? 'character device'
                            : stat.isFIFO() ? 'fifo'
                                : stat.isSocket() ? 'socket'
                                    : stat.isSymbolicLink() ? 'symbolic link'
                                        : 'unknown'

        console.error(`Node of type ${type} at ${filepath} not supported`)
        return false
    })
}

export function ensureMaxTwoLevels(root: string): boolean {
    return walkDocTree(root, (filepath, level, stat) => {
        if (level === CATEGORY_LEVEL && stat.isDirectory())
            return true
        if (level === PAGE_LEVEL && (stat.isDirectory() || stat.isFile()))
            return true
        if (level === SUBPAGE_LEVEL && stat.isFile())
            return true
        console.error(`${redBright(filepath)} not allowed. Readme only supports 2 levels of pages.`)
        return false
    })
}

function validateFrontMatter(docPath: string, content: Buffer): boolean {
    const frontmatter = matter(content)
    const { title, hidden } = frontmatter.data
    let passed = true

    for (const key of Object.keys(frontmatter.data)) {
        if (!['title', 'hidden', 'excerpt'].includes(key)) {
            console.log(`Error: ${redBright(docPath)}: invalid frontmatter key ${key}`)
            passed = false
        }
    }

    if (title == null || typeof title !== 'string') {
        console.error(`Error: ${redBright(docPath)}: title missing or invalid`)
        passed = false
    }

    if (hidden != null && typeof hidden !== 'boolean') {
        console.error(`Error: ${redBright(docPath)}: hidden must be true or false`)
        passed = false
    }

    return passed
}

/** Ensure that all files have valid frontmatter */
export function ensureFrontMatter(root: string): boolean {
    return walkDocTree(root, (filepath, _, stat) => {
        if (stat.isFile())
            return validateFrontMatter(filepath, fs.readFileSync(filepath))
        return true
    })
}

export function ensureUniqueSlugs(docs: string): boolean {
    const slugs = {}

    return walkDocTree(docs, (filepath, level, stat) => {
        if (stat.isDirectory())
            return true

        let parsedPath = path.parse(filepath)

        if (level === SUBPAGE_LEVEL && parsedPath.base === 'index.md') {
            parsedPath = path.parse(parsedPath.dir) // use parent slug
        }

        const slug = slugify(nameWithoutOrder(parsedPath.name))
        if (Object.keys(slugs).includes(slug)) {
            console.error(`Error: ${redBright(filepath)} has the same slug as ${redBright(slugs[slug])}`)
            return false
        } else {
            slugs[slug] = filepath
            return true
        }
    })
}

export function ensureLinksAreValid(docs: string): boolean {
    const slugs = []
    const link = /\[(?<text>[^)\n]+)\]\(doc:(?<target>[A-Za-z0-9-]+)(#[A-Za-z0-9-]+)?\)/g

    // Step 1: Gather all doc slugs
    walkDocTree(docs, (filepath, level, stat) => {
        if (stat.isFile()) {
            if (level == SUBPAGE_LEVEL && path.basename(filepath) == 'index.md')
                slugs.push(slugify(nameWithoutOrder(path.parse(path.dirname(filepath)).name)))
            else
                slugs.push(slugify(nameWithoutOrder(path.parse(filepath).name)))
        }

        return true
    })

    // Step 2: Check that each link points to a valid slug
    return walkDocTree(docs, (filepath, _, stat) => {
        if (stat.isDirectory())
            return true

        const contents = fs.readFileSync(filepath).toString()
        let hasBadLink = false
        for (const match of contents.matchAll(link)) {
            if (!slugs.includes(match.groups.target)) {
                hasBadLink = true
                console.error(`Broken link ${underline(blueBright(`[${match.groups.text}](doc:${match.groups.target})`))} in ${green(filepath)}`)
            }
        }
        return !hasBadLink
    })
}

export function ensureIndexMdExists(root: string): boolean {
    return walkDocTree(root, (filepath, level, stat) => {
        if (stat.isDirectory() && level == PAGE_LEVEL) {
            if (!fs.readdirSync(filepath).includes('index.md')) {
                console.error(`Error: "${filepath}" has no index.md`)
                return false
            }
        }
        return true
    })
}