1. Following up the ./TASK_3.md, there are a few things to add/fix:

- `pnpm ci:typecheck` produces errors
- `pnpm ci:lint` also has errors

2. Make sure that breakpoints and media matching works.
   Especially in both web and native.

You can see that in web there are two techniques:

1. with precompiled styles

Using this tehcnique:

```
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>css-media-vars</title>
    <link
      rel="stylesheet"
      type="text/css"
      href="https://unpkg.com/css-media-vars/css-media-vars.css"
    />
    <style>
      ._ {
        --hover: initial;
      }

      ._:hover {
        --hover: ;
      }
    </style>
  </head>
  <body>
    <div
      class="_"
      style="
        --md_color: var(--media-md) blue;
        --lg_color: var(--media-lg) green;
        color: var(--md_color, var(--lg_color, red));

        --lg_padding: var(--media-lg) 20px;
        padding: var(--lg_padding, initial);
      "
    >
      <div
        class="_"
        style="
          --lg_color: var(--media-lg) orange;
          color: var(--lg_color, red);

          --hover_background: var(--hover) green;
          background: var(--hover_background, initial);
        "
      >
        hello
      </div>
      <p class="_">test</p>
    </div>
  </body>
</html>
```

we can use media matching in inline styles, without javascript runtime.

2. if precompiled styles are not avaialable, use runtime media matching

On native it's just media matching, although if you have ideas for optimisations there - welcome.

3. Support adapters. For example, tailwind adapter for web or `react-native-unistyles` for native

I think it's relevant to suggestion 8 in ./TASK_4.outcome.md

4. Based on ./TASK_4.outcome.md, support

- 1
- 2
- 5
- 6 but make sure it can be configured for react-native/web as I guess it'll affect the types
- 7
- 8 as discuseed in #3

5. Make sure the DX is very simple for all of these use cases:

- inline styles for web, media is runtime
- precompiled + inline styles for web, media is based on the technique from #1
- react-native, including react-native-web
- adapters for tailwind for web or react-native-unistyles and other
