import config from '@toned-config/build/rollup.config'
import { createTransform } from 'rollup-copy-transform-css'
import copy from 'rollup-plugin-copy'

export default config({
  input: ['./shadcn/config.ts'],
  plugins: [
    copy({
      targets: [
        {
          src: 'shadcn/config.css',
          dest: 'dist/shadcn/',
          transform: createTransform({ inline: true, minify: true }),
        },
      ],
    }),
  ],
})
