// Two stand-in features for the matrix builder's own test.
export const features = {
  ok: {
    description: 'accepted everywhere',
    sheet: () => ({ name: 'ok' as const }),
  },
  bad: {
    description: 'refused by two targets',
    sheet: () => ({ name: 'bad' as const }),
  },
}
