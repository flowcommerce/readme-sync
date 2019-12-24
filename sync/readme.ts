import got, { Got, Response, CancelableRequest } from 'got'

const BASE_URL = 'https://dash.readme.io/api/v1'

export interface DocParams {
    title: string
    body: string
    category: string
    parentId?: string
    hidden: boolean
}

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
            hooks: {
                beforeRequest: [
                    (opts) => {
                        console.log(`${opts.method} ${opts.url}`);
                        console.log(opts.body)
                        console.log(opts.headers)
                    }
                ]
            }
        })
    }

    getCategory(slug: string): CancelableRequest<Response<any>>  {
        return this.client.get(`/categories/${slug}`)
    }

    getCategoryDocs(slug: string): CancelableRequest<Response<any>> {
        return this.client.get(`/categories/${slug}/docs`)
    }

    createDoc(body: DocParams): CancelableRequest<Response<any>> {
        return this.client.post('/docs', { json: body })
    }

    updateDoc(slug: string, body: DocParams): CancelableRequest<Response<any>> {
        return this.client.put(`/docs/${slug}`, { json: body })
    }
}