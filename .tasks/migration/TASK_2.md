Migrate the library to this new interface, or example:

```tsx
const styles = stylesheet({
  label: {
    /* tokens */

    // can have flat pseudo classes
    ':hover': {
      /* tokens */
    },

    // can have flat breakpoints or other media rules (eg `@web`). can be potentially be extended like `@sm.only`
    '@sm': {
      /* tokens */
    },
  },

  container: {
    /* tokens */
  },

  // now, cross-element styles are flat, they can be chained like. no need for the `$element` reference. multiple pseudo classes can be applied, like `container:active:hover`, but they should be in alphabet order only (`container:hover:active` won't work)
  'container:hover': {
    container: {
      /* tokens */
    },
    label: {
      /* tokens */
    },
  },
}).variants<{size: 'sm' | 'md'; variant: 'accent' | 'secondary'}>({
  // variants are now defined seperately, they're flat

  '[size=sm]': {
    container: {
      /* tokens */
    },
    label: {
      /* tokens */
    },
  },

  // no nesting
  '[size=sm][variant=accent]': {
    label: {
      /* tokens */
    },
  },
})
```

- Make sure it's typesafe
- It should be performant
- Use it as an opportunity to improve, simplify the codebase
- If it helps, feel free to test if it works for types/implementation, feel free to add tests, but no need to pay attention to tests too much on this step
- Keep thinking and working until it works.
- Save the outcome and findings, commit, move to the next task
