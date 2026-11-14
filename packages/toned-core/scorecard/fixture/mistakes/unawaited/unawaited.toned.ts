// An output whose asynchronous build is exported without `await`.
const build = async () => ({ css: '.later { color: red }' })

export default build()
