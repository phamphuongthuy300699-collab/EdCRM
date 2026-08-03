# Site media editor: all blocks implementation plan

## Goal

Turn the two-block image editor prototype into one consistent, block-first workflow for every image field stored in `site_content_blocks`, while preserving the existing public fallbacks and entity-specific course/teacher editors.

## UX decisions

- Start from the place on the website, not from a file in storage.
- Separate “Images in site blocks” from the raw media library.
- Use one reusable collection editor and one reusable single-image editor.
- Keep metadata and crop settings behind progressive disclosure.
- Show a responsive preview next to the editor on wide screens and below it on narrow screens.
- Save one slot at a time and clearly display unsaved state.
- Keep course card images and teacher portraits in their existing entity editors; link to those workflows instead of duplicating them.

## Site media slots

- Home: hero, facilities gallery, student projects, lesson process, equipment gallery.
- Contacts: map, facade, classroom, gallery.
- Brand and SEO: logo, favicon, social sharing image.
- Footer: fallback map image.

## Implementation

1. Add a typed registry and normalization helpers for all site media slots.
2. Add failing tests for registry coverage, legacy value normalization, metadata preservation, and safe clearing.
3. Build a reusable single-image editor using the existing media library picker.
4. Redesign the collection editor for clearer hierarchy, responsive layout, progressive settings, and explicit save state.
5. Add a grouped all-block editor to the CRM Media tab and retain the raw library as a separate view.
6. Remove the two duplicate collection editors from the Home tab and replace them with a direct handoff to the central editor.
7. Save media changes by merging only the relevant field into the existing block content.
8. Verify desktop/mobile CRM behavior, public fallbacks, lint, tests, and production build.

## Out of scope

- Payments, invoices, MAX, parent access, and demo behavior.
- Course and teacher entity workflows beyond a navigation hint.
- Broad CRM navigation or layout refactors.
