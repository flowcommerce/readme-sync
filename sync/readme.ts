import got, { Got, Response, CancelableRequest } from 'got'

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
            responseType: 'json'
            // hooks: {
            //     beforeRequest: [
            //         (opts) => {
            //             console.log(`${opts.method} ${opts.url}`);
            //             console.log(opts.headers)
            //         }
            //     ]
            // }
        })
    }

    getCategory(slug: string): CancelableRequest<Response<any>>  {
        return this.client.get(`/categories/${slug}`)
    }
}