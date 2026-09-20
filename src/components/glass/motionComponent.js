import { motion } from 'framer-motion'

// motion.create() returns a brand-new component type on every call. Calling it
// inside a render function therefore remounts the whole subtree on every
// re-render (inputs lose focus after each keystroke, sliders drop mid-drag,
// child state resets). Cache one motion component per base component instead.
const cache = new Map()

export function getMotionComponent(Component) {
  if (!cache.has(Component)) cache.set(Component, motion.create(Component))
  return cache.get(Component)
}
