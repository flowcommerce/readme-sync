import got, { Got, Response, CancelableRequest } from 'got'
import { Category, DocSummaryParent, DocForm, Doc } from './generated/readme'

const BASE_URL = 'https://dash.readme.io/api/v1'

export class Client {
    client: Got

    constructor(apiKey: string, version: string) {
        this.client = got.extend({
            prefixUrl: BASE_URL,
            username: apiKey,
            headers: {
                'x-readme-version': version,
            },
            responseType: 'json',
            // hooks: {
            //     beforeRequest: [
            //         (opts) => {
            //             console.log(`${opts.method} ${opts.url}`);
            //             console.log(opts.json)
            //             console.log(opts.headers)
            //         }
            //     ]
            // }
        })
    }

    getCategory(slug: string): CancelableRequest<Response<Category>>  {
        return this.client.get(`/categories/${slug}`)
    }

    getCategoryDocs(slug: string): CancelableRequest<Response<DocSummaryParent[]>> {
        return this.client.get(`/categories/${slug}/docs`)
    }

    createDoc(body: DocForm): CancelableRequest<Response<Doc>> {
        return this.client.post('/docs', { json: body })
    }

    updateDoc(slug: string, body: DocForm): CancelableRequest<Response<Doc>> {
        return this.client.put(`/docs/${slug}`, { json: body })
    }

    deleteDoc(slug: string) {
        return this.client.delete(`/docs/${slug}`)
    }
}