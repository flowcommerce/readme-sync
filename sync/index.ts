#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import yargs from 'yargs'
import matter from 'gray-matter'
import assert from 'assert'
import { DocForm, Category, DocSummaryParent, Doc, isResponseError, createClient as createReadmeClient } from './generated/readme'
import { slugify, orderFromName, nameWithoutOrder } from './util'
import { blueBright, green, yellow, redBright } from 'chalk'
import _debug from 'debug'
import fetch from 'isomorphic-fetch'

const debug = _debug('readme-sync')

const argv = yargs
    .version(false)
    .options({
        'apiKey': { type: 'string', demandOption: true },
        'docs': { type: 'string', demandOption: true },
        'version': { type: 'string', demandOption: true },
    }).argv

const client = createReadmeClient({
    fetch: async (url, options) => {
        debug(`${options.method} ${url}`)
        debug('body', options.body)
        debug('headers', options.headers)
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'x-readme-version': argv.version,
                'authorization': `Basic ${Buffer.from(argv.apiKey + ':').toString('base64')}`,
            }
        })
        debug('response', response)
        return response
    }
})

type RemoteTreeEntry = { category: Category; docs: DocSummaryParent[] }
type RemoteTree = Map<string, RemoteTreeEntry>

async function upsertDoc(remoteTree: RemoteTree, categoryName: string, filepath: string, options: { parent?: Doc; slug?: string; order?: number } = {}): Promise<Doc> {
    assert(fs.statSync(filepath).isFile())

    const docFileName = path.parse(filepath).name

    const slug = options.slug || slugify(nameWithoutOrder(docFileName))

    const existing = remoteTree.get(slugify(categoryName)).docs.find((doc) => {
        if (doc.slug === slug)
            return true

        return doc.children.find(child => child.slug === slug)
    })

    const metadata = matter(fs.readFileSync(filepath))

    const form: DocForm = {
        slug,
        title: metadata.data.title,
        body: metadata.content,
        excerpt: metadata.data.excerpt,
        order: options.order != null ? options.order : orderFromName(docFileName),
        category: remoteTree.get(slugify(categoryName)).category._id,
        parentDoc: options.parent ? options.parent._id : undefined,
        hidden: false,
    }

    const destination = `${slugify(categoryName)}${options.parent ? ` / ${options.parent.slug}` : ''} / ${slug}`

    if (existing) {
        console.log(`\tUpdating ${blueBright(filepath)} -> ${green(destination)}`)
        const doc = await client.docs.putBySlug({
            slug,
            body: form,
        })
        debug('updated')
        debug(doc)
        return doc
    } else {
        console.log(`\tCreating ${blueBright(filepath)} -> ${green(destination)}`)
        const doc = await client.docs.post({ body: form })
        debug('created')
        debug(doc)
        return doc
    }
}

/**
 * Insert and update a doc and its children
 *
 * integration/
 * +- index.md
 * +- setup.md
 * +- config.md
 */
async function upsertDir(remoteTree: RemoteTree, categoryName: string, dirpath: string): Promise<void> {
    assert(fs.statSync(dirpath).isDirectory())

    const children = fs.readdirSync(dirpath)
    if (!children.includes('index.md')) {
        console.error(`ERROR: ${dirpath} requires an index.md page`)
        return
    }

    const parentName = path.basename(dirpath)

    const parent = await upsertDoc(remoteTree, categoryName, path.join(dirpath, 'index.md'), {
        slug: slugify(nameWithoutOrder(parentName)),
        order: orderFromName(parentName),
    })

    for (const child of children) {
        if (child === 'index.md')
            continue

        await upsertDoc(remoteTree, categoryName, path.join(dirpath, child), { parent })
    }
}

/**
 * Delete remote docs that are not present locally.
 */
async function deleteNotPresent({ category, docs }: RemoteTreeEntry, categoryDir: string): Promise<void> {
    for (const remoteDoc of docs) {
        const localDocDir = fs.readdirSync(categoryDir).find(d => slugify(nameWithoutOrder(d)) === remoteDoc.slug)

        // delete children
        for (const remoteChild of remoteDoc.children) {

            const localChild = localDocDir && fs.readdirSync(path.join(categoryDir, localDocDir)).find(d => slugify(nameWithoutOrder(path.parse(d).name)) === remoteChild.slug)

            if (!(localDocDir && localChild && fs.existsSync(path.join(categoryDir, localDocDir, localChild)))) {
                console.log(`\tDeleting remote ${redBright(`${category.slug} / ${remoteDoc.slug} / ${remoteChild.slug}`)}`)
                debug(`because ${categoryDir}/${localDocDir}/${localChild || (remoteChild.slug + '.md')} doesn't exist`)
                await client.docs.deleteBySlug({ slug: remoteChild.slug })
            }
        }

        const indexMdExists = localDocDir && fs.existsSync(path.join(categoryDir, localDocDir, 'index.md'))

        const localDoc = fs.readdirSync(categoryDir).find(d => slugify(nameWithoutOrder(path.parse(d).name)) === remoteDoc.slug)

        // delete parents
        if (!indexMdExists && !localDoc) {
            console.log(`\tDeleting remote ${redBright(`${category.slug} / ${remoteDoc.slug}`)}`)
            debug(`because ${categoryDir}/${localDocDir}/index.md and ${categoryDir}/${remoteDoc.slug}.md don't exist`)
            await client.docs.deleteBySlug({ slug: remoteDoc.slug })
        }
    }
}

/**
 * Insert, update, and delete remote docs.
 *
 * Only two layers of nesting supported
 *
 * category/
 * +- doc1.md
 * +- doc2.md
 * +- group/
 *    +- child.md
 *    +- index.md
 */
async function sync(remoteTree: RemoteTree): Promise<void> {
    for (const category of fs.readdirSync(argv.docs)) {
        if (category.startsWith('.') || !fs.statSync(path.join(argv.docs, category)).isDirectory())
            continue

        console.log(category)
        const categoryPath = path.join(argv.docs, category)
        for (const doc of fs.readdirSync(categoryPath)) {
            const docPath = path.join(categoryPath, doc)
            if (doc.startsWith('.')) {
                continue
            } else if (doc.endsWith('.md')) {
                await upsertDoc(remoteTree, category, docPath)
            } else {
                await upsertDir(remoteTree, category, path.join(argv.docs, category, doc))
            }
        }

        await deleteNotPresent(remoteTree.get(slugify(category)), path.join(argv.docs, category))
    }
}

async function main(): Promise<void> {
    const remoteTree: RemoteTree = new Map()
    let errored = false

    // we need to fetch the categories from local dir names because there is no API to get this from readme.com
    console.log('Fetching categories')
    for (const localCategoryName of fs.readdirSync(argv.docs)) {
        if (localCategoryName.startsWith('.') || !fs.statSync(path.join(argv.docs, localCategoryName)).isDirectory())
            continue

        const slug = slugify(localCategoryName)

        try {
            const [remoteCategory, remoteDocs] = await Promise.all([
                client.categories.getBySlug({ slug }),
                client.categories.getDocsBySlug({ slug }),
            ])
            assert(remoteCategory.slug === slug)
            console.log(`Got ${yellow(localCategoryName)}`)
            remoteTree.set(slug, {
                category: remoteCategory,
                docs: remoteDocs,
            })
        } catch (e) {
            if (isResponseError(e) && e.response.statusCode == 404) {
                console.error(`I cannot create categories yet. Please manually create the category ${localCategoryName} (slug ${slug}) in Readme.`)
                errored = true
            } else {
                throw e
            }
        }
    }

    if (errored)
        return

    debug(remoteTree)
    await sync(remoteTree)
}

main().catch(console.error)
