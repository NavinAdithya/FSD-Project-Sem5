/**
 * Shared, non-reactive scroll value. The landing page writes it from a
 * passive scroll listener; the 3D rig reads it every frame. No React state
 * is involved, so scrolling never triggers a re-render.
 */
export const scrollState = { p: 0 };
