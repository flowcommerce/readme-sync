import fs from 'fs'
import path from 'path'
import { redBright } from 'chalk'
import matter from 'gray-matter'

function checkDoc(docPath: string, content: Buffer): boolean {
    const frontmatter = matter(content)
    const { title, hidden } = frontmatter.data
    let passed = true

    for (const key of Object.keys(frontmatter.data)) {
        if (!['title', 'hidden'].includes(key)) {
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

    for (const category of fs.readdirSync(docs)) {
        if (category.startsWith('.') || !fs.statSync(path.join(docs, category)).isDirectory())
            continue

        const categoryPath = path.join(docs, category)
        for (const doc of fs.readdirSync(categoryPath)) {
            const docPath = path.join(categoryPath, doc)
            if (doc.startsWith('.')) {
                continue
            } else if (doc.endsWith('.md')) {
                const content = fs.readFileSync(docPath)
                passed = passed && checkDoc(docPath, content)
            } else {

                for (const child of fs.readdirSync(docPath)) {
                    const childPath = path.join(docPath, child)

                    if (child.startsWith('.')) {
                        continue
                    } else if (child.endsWith('.md')) {
                        const content = fs.readFileSync(childPath)
                        passed = passed && checkDoc(childPath, content)
                    }

                }

            }
        }
    }

    return passed
}