import isomorphicFetch from 'isomorphic-fetch';
import url from 'url';

declare namespace io.flow.readme.v0.models {
  interface Category {
    readonly '_id': string;
    readonly 'version': string;
    readonly 'project': string;
    readonly 'slug': string;
    readonly 'title': string;
    readonly 'reference': boolean;
    readonly 'order': number;
    readonly 'createdAt': string;
  }

  interface Doc {
    readonly '_id': string;
    readonly 'body': string;
    readonly 'category': string;
    readonly 'hidden': boolean;
    readonly 'order': number;
    readonly 'parentDoc': string;
    readonly 'project': string;
    readonly 'slug': string;
    readonly 'title': string;
    readonly 'type': string;
    readonly 'version': string;
  }

  interface DocForm {
    readonly 'slug'?: string;
    readonly 'title'?: string;
    readonly 'body'?: string;
    readonly 'excerpt'?: string;
    readonly 'category'?: string;
    readonly 'parentDoc'?: string;
    readonly 'hidden'?: boolean;
    readonly 'order': number;
  }

  interface DocSummaryChild {
    readonly '_id': string;
    readonly 'hidden': boolean;
    readonly 'order': number;
    readonly 'slug': string;
    readonly 'title': string;
  }

  interface DocSummaryParent {
    readonly '_id': string;
    readonly 'hidden': boolean;
    readonly 'order': number;
    readonly 'slug': string;
    readonly 'title': string;
    readonly 'children': io.flow.readme.v0.models.DocSummaryChild[];
  }

  interface Error {
    readonly 'description': string;
    readonly 'error': string;
    readonly 'errors'?: string;
  }
}

export type Category = io.flow.readme.v0.models.Category;
export type Doc = io.flow.readme.v0.models.Doc;
export type DocForm = io.flow.readme.v0.models.DocForm;
export type DocSummaryChild = io.flow.readme.v0.models.DocSummaryChild;
export type DocSummaryParent = io.flow.readme.v0.models.DocSummaryParent;
export type Error = io.flow.readme.v0.models.Error;
type FetchFunction = (url: string, options?: RequestInit) => Promise<Response>;
export type HttpClientMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'CONNECT' | 'OPTIONS' | 'TRACE';

export interface HttpClientHeaders {
  [key: string]: string;
}

export interface HttpClientQuery {
  [key: string]: string | number | boolean | string[] | number[] | boolean[] | undefined | null;
}

export interface HttpClientRequest {
  body?: any;
  headers?: HttpClientHeaders;
  method?: HttpClientMethod;
  pathname: string;
  query?: HttpClientQuery;
}

export interface HttpClientResponse<T> {
  body: T;
  headers: HttpClientHeaders;
  request: HttpClientRequest;
  statusCode: number;
  statusText: string;
}

export interface HttpClientOptions {
  baseUrl?: string;
  fetch?: FetchFunction;
}

class BaseError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;

    if (Error.hasOwnProperty('captureStackTrace')) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class ResponseError extends BaseError {
  public response: HttpClientResponse<any>;
  public type: 'response_error' = 'response_error';

  constructor(response: HttpClientResponse<any>) {
    super('Response is outside the 2xx status code range');
    this.response = response;
  }
}

export function isResponseError(error: any): error is ResponseError {
  return error != null && error.type === 'response_error';
}

function isResponseEmpty(response: Response): boolean {
  const contentLength = response.headers.get('Content-Length');
  return Number.parseInt(contentLength, 10) === 0;
}

function isResponseJson(response: Response): boolean {
  const contentType = response.headers.get('Content-Type');
  return contentType != null && contentType.indexOf('json') >= 0;
}

function parseJson(response: Response): Promise<any> {
  return !isResponseEmpty(response) && isResponseJson(response) ? response.json() : Promise.resolve();
}

function parseHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};

  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  return headers;
}

class HttpClient {
  private fetch: FetchFunction;

  constructor(options: HttpClientOptions = {}) {
    this.fetch = options.fetch != null ? options.fetch : isomorphicFetch;
  }

  public request(request: HttpClientRequest): Promise<any> {
    const location = url.format({
      hostname: 'dash.readme.io',
      pathname: '/api/v1' + request.pathname,
      protocol: 'https:',
      query: request.query,
    });

    const headers = {
      accept: 'application/json',
      'content-type': 'application/json',
      ...request.headers,
    };

    return this.fetch(location, {
      body: JSON.stringify(request.body),
      headers,
      method: request.method,
    }).then((response) => {
      return parseJson(response).then((json) => {
        return {
          body: json,
          headers: parseHeaders(response),
          request,
          statusCode: response.status,
          statusText: response.statusText,
        };
      });
    }).then((response) => {
      if (response.statusCode >= 200 && response.statusCode < 300)
        return response.body;

      throw new ResponseError(response);
    });
  }
}

class BaseResource {
  protected client: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.client = new HttpClient(options);
  }
}

export class CategoriesResource extends BaseResource {
  public getBySlug(
    params: {
      headers?: HttpClientHeaders,
      slug: string
    },
  ): Promise<io.flow.readme.v0.models.Category> {
    return this.client.request({
      headers: params.headers,
      method: 'GET',
      pathname: `/categories/${encodeURIComponent(params.slug)}`,
    });
  }

  public getDocsBySlug(
    params: {
      headers?: HttpClientHeaders,
      slug: string
    },
  ): Promise<io.flow.readme.v0.models.DocSummaryParent[]> {
    return this.client.request({
      headers: params.headers,
      method: 'GET',
      pathname: `/categories/${encodeURIComponent(params.slug)}/docs`,
    });
  }
}

export class DocsResource extends BaseResource {
  public post(
    params: {
      body: io.flow.readme.v0.models.DocForm,
      headers?: HttpClientHeaders
    },
  ): Promise<io.flow.readme.v0.models.Doc> {
    return this.client.request({
      body: params.body,
      headers: params.headers,
      method: 'POST',
      pathname: '/docs',
    });
  }

  public putBySlug(
    params: {
      body: io.flow.readme.v0.models.DocForm,
      headers?: HttpClientHeaders,
      slug: string
    },
  ): Promise<io.flow.readme.v0.models.Doc> {
    return this.client.request({
      body: params.body,
      headers: params.headers,
      method: 'PUT',
      pathname: `/docs/${encodeURIComponent(params.slug)}`,
    });
  }

  public deleteBySlug(
    params: {
      headers?: HttpClientHeaders,
      slug: string
    },
  ): Promise<void> {
    return this.client.request({
      headers: params.headers,
      method: 'DELETE',
      pathname: `/docs/${encodeURIComponent(params.slug)}`,
    });
  }
}

export function createClient(options?: HttpClientOptions) {
  return {
    categories: new CategoriesResource(options),
    docs: new DocsResource(options),
  };
}