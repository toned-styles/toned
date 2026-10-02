/** Remove only the failed generation. Recovery is lazy, avoiding crash/restart loops. */
export function evictClosedSession<T>(
  sessions: Map<string, T>,
  key: string,
  session: T,
  expected: boolean,
  notify: () => void,
): boolean {
  if (expected || sessions.get(key) !== session) return false
  sessions.delete(key)
  notify()
  return true
}
