import * as fs from 'fs'
import * as path from 'path'
import yargs = require('yargs')
import { slugify } from './slugify'
import { Client, DocParams } from './readme'
import { HTTPError } from 'got'
import * as matter from 'gray-matter'
import * as assert from 'assert'

const argv = yargs
                .version(false)
                .options({
                    'apiKey': { type: 'string', demandOption: true },
                    'docs': { type: 'string', demandOption: true },
                    'version': { type: 'string', demandOption: true },
                }).argv

const client = new Client(argv.apiKey, argv.version)

function upsertDoc(remoteTree: object, category: string, filepath: string, options: { parentDoc?: string, slug?: string } = {}) {
    assert(fs.statSync(filepath).isFile)
    const slug = options.slug || slugify(path.parse(filepath).name)

    console.log(`Syncing doc ${filepath} with slug "${slug}"`)

    const existing = remoteTree[slugify(category)].docs.find((doc) => {
        if (doc.slug === slug)
            return true

        return doc.children.find(child => child.slug === slug)
    })

    const metadata = matter(fs.readFileSync(filepath))

    const form: DocParams = {
        slug,
        title: metadata.data.title,
        body: metadata.content,
        category: remoteTree[slugify(category)]._id,
        parentDoc: options.parentDoc,
        hidden: false,
    }

    if (existing) {
        console.log(`Updating ${filepath} -> ${category} / ${slug}`)
        return client.updateDoc(slug, form).then(x => x.body)
    } else {
        console.log(`Creating ${filepath} -> ${category} / ${slug}`)
        return client.createDoc(form).then(x => x.body)
    }
}

async function upsertDir(remoteTree: object, category: string, dirpath: string) {
    assert(fs.statSync(dirpath).isDirectory)
    console.log(`Syncing dir ${dirpath}`)

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
async function sync(remoteTree: object) {
    for (const category of fs.readdirSync(argv.docs)) {
        const categoryPath = path.join(argv.docs, category)
        for (const doc of fs.readdirSync(categoryPath)) {
            const docPath = path.join(categoryPath, doc)
            if (doc.endsWith('.md')) {
                console.log((await upsertDoc(remoteTree, category, docPath, null)).body)
            } else {
                await upsertDir(remoteTree, category, path.join(argv.docs, category, doc))
            }
        }
    }
}

async function main() {
    const localCategories = fs.readdirSync(argv.docs)
    const remoteTree: object = {}
    let errored = false

    console.log('Fetching categories')
    for (const localCategoryName of localCategories) {
        try {
            const remoteCategory = await client.getCategory(slugify(localCategoryName))
            remoteTree[remoteCategory.body.slug] = remoteCategory.body
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

    for (const category of Object.values(remoteTree)) {
        const remoteDocs = await client.getCategoryDocs(category.slug)
        remoteTree[category.slug].docs = remoteDocs.body
    }

    console.log(require('util').inspect(remoteTree, { depth: 999 }))
    await sync(remoteTree)
}

main().catch(console.error)