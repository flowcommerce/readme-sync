import { findSlugInCategory, removeSlugFromTree, addDocUnderSlug } from './util'

test('findSlugInCategory', () => {
    const doc = {
        slug: 'slug',
        children: []
    }
    expect(findSlugInCategory({
        category: null,
        docs: [doc]
    }, 'slug')).toBe(doc)

    expect(findSlugInCategory({
        category: null,
        docs: [{
            slug: 'a',
            children: [{
                slug: 'b',
                children: [
                    {
                        slug: 'c',
                        children: []
                    },
                    doc
                ]
            }]
        }]
    }, 'slug')).toBe(doc)

    expect(findSlugInCategory({
        category: null,
        docs: [{
            slug: 'a',
            children: [{
                slug: 'b',
                children: [
                    {
                        slug: 'c',
                        children: []
                    },
                    {
                        slug: 'd',
                        children: [],
                    }
                ]
            }]
        }]
    }, 'slug')).toBe(null)
})

test('removeSlugFromTree', () => {
    const b = {
        slug: 'b',
        children: [],
    }
    const a = {
        slug: 'a',
        children: [b],
    }
    const tree = {
        category: null,
        docs: [a],
    }

    expect(removeSlugFromTree(tree, 'd')).toBeNull()

    expect(removeSlugFromTree(tree, 'b')).toBe(b)
    expect(a.children).toHaveLength(0)

    expect(removeSlugFromTree(tree, 'a')).toBe(a)
    expect(tree.docs).toHaveLength(0)
})

test('addDocUnderSlug', () => {
    const tree = {
        category: null,
        docs: [{
            slug: 'a',
            children: [
                {
                    slug: 'b',
                    children: []
                },
                {
                    slug: 'c',
                    children: []
                }
            ]
        }]
    }

    const newDoc = {
        slug: 'd',
        children: []
    }

    expect(addDocUnderSlug(tree, newDoc, 'c')).toBeTruthy()
    expect(tree.docs[0].children[1].children[0]).toBe(newDoc)

    expect(addDocUnderSlug(tree, {
        slug: 'x',
        children: []
    }, 'g')).toBeFalsy()

    expect(addDocUnderSlug(tree, {
        slug: 'x',
        children: []
    }, null)).toBe(true)
    expect(tree.docs[1].slug).toBe('x')
})
