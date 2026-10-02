import { createElements } from '@toned/react'

import { type ProfileVariants, profileStyles } from './styles.ts'

const Profile = createElements(profileStyles)

export default function App(variants: Partial<ProfileVariants>) {
  return (
    <Profile {...variants}>
      <Profile.Root as="section">
        <Profile.Card as="div">
          <Profile.Eyebrow as="span">DESIGN ENGINEER</Profile.Eyebrow>
          <Profile.Name as="h3">Ada Lovelace</Profile.Name>
          <Profile.Bio as="p">
            One theme token sets four custom properties. Every other token reads
            them, so switching the theme recolours the whole card.
          </Profile.Bio>
          <Profile.Follow as="button" type="button">
            Follow
          </Profile.Follow>
        </Profile.Card>
      </Profile.Root>
    </Profile>
  )
}
