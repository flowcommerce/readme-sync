import * as fs from 'fs'
import yargs = require('yargs')
import { slug } from './slug'
import { Client } from './readme'
import { HTTPError } from 'got'

const argv = yargs
                .version(false)
                .options({
                    'apiKey': { type: 'string', demandOption: true },
                    'docs': { type: 'string', demandOption: true },
                    'version': { type: 'string', demandOption: true },
                }).argv

const client = new Client(argv.apiKey, argv.version)

async function main() {
    const localCategories = fs.readdirSync(argv.docs)
    const remoteCategories = {}
    let errored = false

    console.log('Fetching categories')
    for (const localCategoryName of localCategories) {
        try {
            const remoteCategory = await client.getCategory(slug(localCategoryName))
            remoteCategories[remoteCategory.body._id] = remoteCategory.body
        } catch (e) {
            if (e instanceof HTTPError) {
                if (e.response.statusCode == 404) {
                    console.log(`I cannot create categories yet. Please manually create the category "${localCategoryName}" (slug "${slug(localCategoryName)}) in Readme.`)
                    errored = true
                }
            }
        }
    }

    if (errored)
        return

    
}

main().catch(console.error)