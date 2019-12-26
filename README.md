# readme.com Sync Tool

This is a CLI tool that synchronizes markdown files from a local directory (typically in a git repo) to https://readme.com.

## Usage

`npx readme-sync --apiKey <key> --version <version> --docs <dir>`

## Development

1. `git clone https://github.com/flowcommerce/readme-sync`
1. `nvm install`
1. `npm install`
1. `npx ts-node sync/index.ts --apiKey <key> --version <version> --docs <dir>`
