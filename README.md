# readme.com Sync Tool

This is a CLI tool that synchronizes markdown files from a local directory (typically in a git repo) to https://readme.com.

## Usage

`npx readme-sync --apiKey <key> --version <version> --docs <dir>`

## Expected Directory Structure

Top level folders are mapped to categories. Second and third level `.md` files are synced as docs. Readme only supports two levels of nesting (Category > Parent Doc > Child Doc). If you want a doc with children, create a folder with the doc name, and create an `index.md` file inside it.

Example:

```
docs
├── Welcome
│   ├── introduction.md
│   └── license.md
└── Integration
    ├── installation.md
    ├── setup.md
    └── Configuration
        ├── index.md
        ├── database.md
        └── proxy.md
```

Becomes

![](result.png)

## Development

1. `git clone https://github.com/flowcommerce/readme-sync`
1. `nvm install`
1. `npm install`
1. `npx ts-node sync/index.ts --apiKey <key> --version <version> --docs <dir>`