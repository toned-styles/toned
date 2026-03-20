Read the codebase carefully.
There is not much documentation (and even if there README files don't trust them as they were generated quickly)

Trust the codebase, the architecture, and understand the core concept of this library.

You can see the examples in @examples/ folder.

But in short, the key idea is:

1. users can define their own design system using `defineSystem`. they can define the token behaviour, values etc.

2. using the defined system, users can use `stylesheet` to create platform-agnostic styles, using the tokens from their system. Think about it as tailwind classnames, but it's in the object, and also it's more like a template without any styling runtime which can be applied later.

For example,

```ts
import {stylesheet} from 'my-design-system'

export const styles = stylesheet({
  container: {
    textColor: 'on_action',
    bgColor: 'default',
    alignItems: 'flex-start',
    flexLayout: 'column',
  },
  code: {textColor: 'destructive'},
})
```

It can be rendered as inline styles for web, can be composition of classnames from the extracted css for the system, can be for react-native, can be a composition of tailwind classes if there is an adaptor for it, can be based on `react-native-unistyles` again if there is an adaptor etc.

For example,

```tsx
import {styles} from '@examples/shared/card'
import {useStyles} from '@toned/react'
import {t} from 'my-design-system'

import {Button} from './Button.tsx'

export function Card() {
  const s = useStyles(styles)

  return (
    <div {...s.container}>
      <Button label={String(Math.random())} />

      <span {...t({textColor: 'status_info'})}>
        Edit <span {...s.code}>src/App.tsx</span> and save to test HMR
      </span>
    </div>
  )
}
```

You can see that styles are spreaded like `{...s.container}` - this is essential as it enables adapting the structure based on the environment and adaptors.

You can also see `t` function which can be used to inline tokens like inline styles. Same principles but less powerful that `stylesheet` as you can't manage states or elements.

You should also understand how variants/states work and how they can be efficiently applied in the component using bitwise operations to calculate the state matching.

For example,

```tsx
import {stylesheet} from 'my-design-system'
import {useStyles} from '@toned/react'
import {t} from 'my-design-system'

export const styles = stylesheet({
  ...stylesheet.state<{
    variant: 'primary' | 'secondary'
  }>,

  container: {
    textColor: 'on_action',
    bgColor: 'default',
    alignItems: 'flex-start',
    flexLayout: 'column',
  },
  code: {textColor: 'destructive'},

  '[variant=primary]': {
    $container: {
      bgColor: 'primary',
    },
  },
})

export function Card() {
  const s = useStyles(styles, {variant: 'primary'})

  return (
    <div {...s.container}>
      <Button label={String(Math.random())} />

      <span {...t({textColor: 'status_info'})}>
        Edit <span {...s.code}>src/App.tsx</span> and save to test HMR
      </span>
    </div>
  )
}
```
