import fs from 'fs'
import path from 'path'
import { redBright } from 'chalk'
import matter from 'gray-matter'
import { slugify, nameWithoutOrder } from './util'

function walkDocTree(root: string, cb: (docPath: string, isChild: boolean) => void): void {
    for (const category of fs.readdirSync(root)) {
        if (category.startsWith('.') || !fs.statSync(path.join(root, category)).isDirectory())
            continue

        const categoryPath = path.join(root, category)
        for (const doc of fs.readdirSync(categoryPath)) {
            const docPath = path.join(categoryPath, doc)
            if (doc.startsWith('.')) {
                continue
            } else if (doc.endsWith('.md')) {
                cb(docPath, false)
            } else {

                for (const child of fs.readdirSync(docPath)) {
                    const childPath = path.join(docPath, child)

                    if (child.startsWith('.')) {
                        continue
                    } else if (child.endsWith('.md')) {
                        cb(childPath, true)
                    }

                }

            }
        }
    }

}

function checkDoc(docPath: string, content: Buffer): boolean {
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
export function ensureFrontMatter(docs: string): boolean {
    let passed = true

    walkDocTree(docs, (docPath) => {
        passed = passed && checkDoc(docPath, fs.readFileSync(docPath))
    })

    return passed
}

export function ensureUniqueSlugs(docs: string): boolean {
    const slugs = {}
    let passed = true

    walkDocTree(docs, (docPath, isChild) => {
        let parsedPath = path.parse(docPath)

        if (isChild && parsedPath.base === 'index.md') {
            parsedPath = path.parse(parsedPath.dir) // use parent slug
        }

        const slug = slugify(nameWithoutOrder(parsedPath.name))
        if (Object.keys(slugs).includes(slug)) {
            console.log(`Error: ${redBright(docPath)} has the same slug as ${redBright(slugs[slug])}`)
            passed = false
        } else {
            slugs[slug] = docPath
        }
    })

    return passed
}