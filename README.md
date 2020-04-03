# readme.com Sync Tool

This is a CLI tool that synchronizes markdown files from a local directory (typically in a git repo) to https://readme.com.

## Usage

`npx readme-sync --apiKey <key> --version <version> --docs <dir>`

or, to just validate the files:

`npx readme-sync --apiKey <key> --version <version> --docs <dir> --validateOnly`

## Expected Directory Structure

Top level folders are mapped to categories. Second and third level `.md` files are synced as docs. Readme only supports two levels of nesting (Category > Parent Doc > Child Doc). If you want a doc with children, create a folder with the doc name, and create an `index.md` file inside it.

The folder and file names are turned into the slugs.

Example:

```
docs
├── Welcome
│   ├── 00 - Introduction.md
│   └── 10 - License.md
└── Integration
    ├── 00 - Installation.md
    ├── 10 - Setup.md
    └── Configuration
        ├── index.md
        ├── 00 - Database.md
        └── 10 - Proxy.md
```

Becomes

![](result.png)

## File Contents

Markdown, with front matter:

```markdown
---
title: "Installation"
excerpt: "How to Install Arch Linux"
hidden: true
---

# Installation

...
```

## Limitations

- Categories cannot yet be created automatically. They must be manually created.

## Notes on behavior

**ACROSS** multiple categories: how does syncing of pages work?

  - Q: I have a subset of categories to sync locally, and a superset of categories in the web UI? What happens?
      - A: Only the subset of local categories gets synced. Any category that doesn't have a local directory is untouched.

**WITHIN** 1 category: how does syncing of pages work? 
  - Q I have a superset of docs in the web UI in 1 category, and only sync a local subset of them. do the other docs in the web UI get deleted?
       - A: yes, the superset of docs in the web UI is deleted, and now your category only contains the subset of docs you synced locally.
  - Q: I have a superset of docs in Github in 1 category, and only a subset in the web UI. do the docs get added to the ReadMe web UI?
      - A: yup, the local docs get created in the web UI.

  **OTHER NOTES ON BEHAVIOR**  
- Hide/Publish pages: You can control whether pages are published or hidden in each page's frontmattter with hidden: true or hidden: false.
- if you try to duplicate markdown file names, you'll get duplicate file warnings, even if the files are in separate docs categories.
- the publishing order is alphanumeric. You can force ordering by prefixing your files with 01, 02, etc. Then, these ordered pages go first in the table of contents (stripped of their 01 - , -02 ordering prefixes). After that, for example, if you created a "a-page.md", it would be added at the end of the category's table of contents. if you then created another local page "aa-page.md", it would show up in the table of contents before a-page.md

## Development

1. `git clone https://github.com/flowcommerce/readme-sync`
1. `nvm install`
1. `npm install`
1. `npx ts-node sync/index.ts --apiKey <key> --version <version> --docs <dir>`



