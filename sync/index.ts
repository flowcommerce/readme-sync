#!/usr/bin/env node
import * as fs from 'fs'
import * as path from 'path'
import * as yargs from 'yargs'
import { Client } from './client'
import { HTTPError } from 'got'
import * as matter from 'gray-matter'
import * as assert from 'assert'
import { DocForm, Category, DocSummaryParent, Doc } from './generated/readme'
import { slugify } from './slugify'
import { blueBright, green, yellow, redBright } from 'chalk'

const argv = yargs
    .version(false)
    .options({
        'apiKey': { type: 'string', demandOption: true },
        'docs': { type: 'string', demandOption: true },
        'version': { type: 'string', demandOption: true },
    }).argv

const client = new Client(argv.apiKey, argv.version)

type RemoteTreeEntry = { category: Category; docs: DocSummaryParent[] }
type RemoteTree = Map<string, RemoteTreeEntry>

function upsertDoc(remoteTree: RemoteTree, categoryName: string, filepath: string, options: { parent?: Doc; slug?: string } = {}): Promise<Doc> {
    assert(fs.statSync(filepath).isFile)
    const slug = options.slug || path.parse(filepath).name

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
        category: remoteTree.get(slugify(categoryName)).category._id,
        parentDoc: options.parent ? options.parent._id : undefined,
        hidden: false,
    }

    const destination = `${categoryName}${options.parent ? ` / ${options.parent.title}` : ''} / ${metadata.data.title}`

    if (existing) {
        console.log(`\tUpdating ${blueBright(filepath)} -> ${green(destination)}`)
        return client.updateDoc(slug, form).then(x => x.body)
    } else {
        console.log(`\tCreating ${blueBright(filepath)} -> ${green(destination)}`)
        return client.createDoc(form).then(x => x.body)
    }
}

async function upsertDir(remoteTree: RemoteTree, categoryName: string, dirpath: string): Promise<void> {
    assert(fs.statSync(dirpath).isDirectory)

    const children = fs.readdirSync(dirpath)
    if (!children.includes('index.md')) {
        console.error(`ERROR: ${dirpath} requires an index.md page`)
        return
    }

    const parent = await upsertDoc(remoteTree, categoryName, path.join(dirpath, 'index.md'), { slug: slugify(path.basename(dirpath)) })

    for (const child of children) {
        if (child === 'index.md')
            continue

        await upsertDoc(remoteTree, categoryName, path.join(dirpath, child), { parent })
    }
}

async function deleteNotPresent({ category, docs }: RemoteTreeEntry, categoryDir: string): Promise<void> {
    for (const doc of docs) {
        const dir = fs.readdirSync(categoryDir).find(d => slugify(d) === doc.slug)

        // delete children
        for (const child of doc.children) {
            if (!dir || !fs.existsSync(path.join(categoryDir, dir, child.slug + '.md'))) {
                console.log(`\tDeleting remote ${redBright(`${category.title} / ${doc.title} / ${child.title}`)}`)
                await client.deleteDoc(child.slug)
            }
        }

        // delete parents
        if (!(dir && fs.existsSync(path.join(categoryDir, dir, 'index.md')))
         && !fs.existsSync(path.join(categoryDir, doc.slug + '.md'))) {
            console.log(`\tDeleting remote ${redBright(`${category.title} / ${doc.title}`)}`)
            await client.deleteDoc(doc.slug)
        }
    }
}

/**
 * Only one layer of nesting supported
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
        if (category.startsWith('.'))
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
    const localCategories = fs.readdirSync(argv.docs)
    const remoteTree: RemoteTree = new Map()
    let errored = false

    console.log('Fetching categories')
    for (const localCategoryName of localCategories) {
        if (localCategoryName.startsWith('.'))
            continue

        const slug = slugify(localCategoryName)

        try {
            const [remoteCategory, remoteDocs] = await Promise.all([
                client.getCategory(slug),
                client.getCategoryDocs(slug),
            ])
            assert(remoteCategory.body.slug === slug)
            console.log(`Got ${yellow(localCategoryName)}`)
            remoteTree.set(slug, {
                category: remoteCategory.body,
                docs: remoteDocs.body,
            })
        } catch (e) {
            if (e instanceof HTTPError) {
                if (e.response.statusCode == 404) {
                    console.log(`I cannot create categories yet. Please manually create the category ${localCategoryName} (slug ${slug}) in Readme.`)
                    errored = true
                }
            }
        }
    }

    if (errored)
        return

    console.log(require('util').inspect(remoteTree, { depth: 999 }))
    await sync(remoteTree)
}

main().catch(console.error)
