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
}

export type Category = io.flow.readme.v0.models.Category;
export type Doc = io.flow.readme.v0.models.Doc;
export type DocForm = io.flow.readme.v0.models.DocForm;
export type DocSummaryChild = io.flow.readme.v0.models.DocSummaryChild;
export type DocSummaryParent = io.flow.readme.v0.models.DocSummaryParent;