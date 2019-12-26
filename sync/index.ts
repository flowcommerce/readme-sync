import * as fs from 'fs'
import * as path from 'path'
import * as yargs from 'yargs'
import { slugify } from './slugify'
import { Client } from './readme'
import { HTTPError } from 'got'
import * as matter from 'gray-matter'
import * as assert from 'assert'
import { DocForm, Category, DocSummaryParent } from './generated/readme'

const argv = yargs
                .version(false)
                .options({
                    'apiKey': { type: 'string', demandOption: true },
                    'docs': { type: 'string', demandOption: true },
                    'version': { type: 'string', demandOption: true },
                }).argv

const client = new Client(argv.apiKey, argv.version)

type RemoteTreeEntry = { category: Category, docs: DocSummaryParent[] }
type RemoteTree = Map<string, RemoteTreeEntry>

function upsertDoc(remoteTree: RemoteTree, category: string, filepath: string, options: { parentDoc?: string, slug?: string } = {}) {
    assert(fs.statSync(filepath).isFile)
    const slug = options.slug || slugify(path.parse(filepath).name)

    const existing = remoteTree.get(slugify(category)).docs.find((doc) => {
        if (doc.slug === slug)
            return true

        return doc.children.find(child => child.slug === slug)
    })

    const metadata = matter(fs.readFileSync(filepath))

    const form: DocForm = {
        slug,
        title: metadata.data.title,
        body: metadata.content,
        category: remoteTree.get(slugify(category)).category._id,
        parentDoc: options.parentDoc,
        hidden: false,
    }

    if (existing) {
        console.log(`\tUpdating ${filepath} -> ${category} / ${slug}`)
        return client.updateDoc(slug, form).then(x => x.body)
    } else {
        console.log(`\tCreating ${filepath} -> ${category} / ${slug}`)
        return client.createDoc(form).then(x => x.body)
    }
}

async function upsertDir(remoteTree: RemoteTree, category: string, dirpath: string) {
    assert(fs.statSync(dirpath).isDirectory)
    console.log(`\tSyncing dir ${dirpath}`)

    const children = fs.readdirSync(dirpath)
    if (!children.includes('index.md')) {
        console.error(`ERROR: ${dirpath} requires an index.md page`)
        return
    }

    const parent = await upsertDoc(remoteTree, category, path.join(dirpath, 'index.md'), { slug: slugify(path.basename(dirpath)) })

    for (const child of children) {
        if (child === 'index.md')
            continue;

        await upsertDoc(remoteTree, category, path.join(dirpath, child), { parentDoc: parent._id })
    }
}

async function deleteNotPresent({ category, docs }: RemoteTreeEntry) {
    for (const doc of docs) {
        // delete children
        for (const child of doc.children) {
            if (!fs.existsSync(path.join(argv.docs, category.slug, doc.slug, child.slug + '.md'))) {
                console.log(`\tDeleting remote ${category.slug} / ${doc.slug} / ${child.slug}`)
                await client.deleteDoc(doc.slug)
            }
        }

        // delete parents
        if (!fs.existsSync(path.join(argv.docs, category.slug, doc.slug, 'index.md'))
         && !fs.existsSync(path.join(argv.docs, category.slug, doc.slug + '.md'))) {
            console.log(`\tDeleting remote ${category.slug} / ${doc.slug}`)
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
async function sync(remoteTree: RemoteTree) {
    for (const category of fs.readdirSync(argv.docs)) {
        console.log(category)
        const categoryPath = path.join(argv.docs, category)
        for (const doc of fs.readdirSync(categoryPath)) {
            const docPath = path.join(categoryPath, doc)
            if (doc.endsWith('.md')) {
                await upsertDoc(remoteTree, category, docPath)
            } else {
                await upsertDir(remoteTree, category, path.join(argv.docs, category, doc))
            }
        }

        await deleteNotPresent(remoteTree.get(slugify(category)))
    }
}

async function main() {
    const localCategories = fs.readdirSync(argv.docs)
    const remoteTree: RemoteTree = new Map()
    let errored = false

    console.log('Fetching categories')
    for (const localCategoryName of localCategories) {
        try {
            const remoteCategory = await client.getCategory(slugify(localCategoryName))
            remoteTree.set(remoteCategory.body.slug, { category: remoteCategory.body, docs: [] })
        } catch (e) {
            if (e instanceof HTTPError) {
                if (e.response.statusCode == 404) {
                    console.log(`I cannot create categories yet. Please manually create the category "${localCategoryName}" (slug "${slugify(localCategoryName)}) in Readme.`)
                    errored = true
                }
            }
        }
    }

    if (errored)
        return

    for (const [slug, { category }] of remoteTree) {
        const remoteDocs = await client.getCategoryDocs(category.slug)
        remoteTree.set(category.slug, {
            category,
            docs: remoteDocs.body,
        })
    }

    console.log(require('util').inspect(remoteTree, { depth: 999 }))
    await sync(remoteTree)
}

main().catch(console.error)