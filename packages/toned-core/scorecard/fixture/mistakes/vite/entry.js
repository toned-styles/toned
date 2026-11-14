// A Vite app importing an output that no `*.toned.ts` declares.
import manifest from 'toned:nope/manifest'

console.log(manifest)
