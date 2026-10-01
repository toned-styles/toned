import { buttonStyles } from './sheets/button.ts'
import {
  avatarStyles,
  badgeStyles,
  chartStyles,
  feedStyles,
  meterStyles,
  panelStyles,
  statStyles,
  tableStyles,
} from './sheets/content.ts'
import {
  checkStyles,
  fieldStyles,
  segmentStyles,
  sliderStyles,
  switchStyles,
  tabStyles,
} from './sheets/controls.ts'
import { dialogStyles, menuStyles, toastStyles } from './sheets/overlay.ts'
import { navStyles, shellStyles, sideItemStyles } from './sheets/shell.ts'
import { swatchStyles } from './sheets/swatch.ts'

/** Every sheet the showcase renders, for the CSS build. */
export const themeSheets = [
  shellStyles,
  navStyles,
  sideItemStyles,
  buttonStyles,
  panelStyles,
  statStyles,
  badgeStyles,
  tableStyles,
  meterStyles,
  avatarStyles,
  chartStyles,
  feedStyles,
  fieldStyles,
  checkStyles,
  switchStyles,
  segmentStyles,
  sliderStyles,
  tabStyles,
  dialogStyles,
  menuStyles,
  toastStyles,
  swatchStyles,
]
