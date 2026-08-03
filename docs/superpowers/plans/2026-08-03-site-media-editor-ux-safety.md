# Site Media Editor UX Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add exact public block previews, unsaved-change protection, reversible removals, and complete media usage visibility, then publish the verified result to `main`.

**Architecture:** Extract the project and lesson card renderers into shared public components consumed by both `LandingPageClient` and the CRM preview. Keep dirty state in the CRM page so navigation and `beforeunload` use one source of truth. Model removal as a reversible draft operation, and centralize media usage lookup in a server helper used by both GET listing and DELETE protection.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, Vitest, Playwright, Git.

---

### Task 1: Exact public previews

**Files:**
- Create: `apps/web/src/features/site-editor/media/PublicSiteMediaCards.tsx`
- Modify: `apps/web/src/features/site-editor/media/BlockMediaPreview.tsx`
- Modify: `apps/web/src/features/site-editor/media/ImageCollectionEditor.tsx`
- Modify: `apps/web/src/app/(public)/LandingPageClient.tsx`
- Test: `apps/web/src/__tests__/landing-page-blocks.test.tsx`

- [ ] Add a failing test asserting that public and CRM project/lesson previews expose the same shared renderer markers.
- [ ] Run the focused test and confirm it fails because the shared renderers do not exist.
- [ ] Extract `PublicStudentProjectCard` and `PublicLessonStepCard`, pass the slot id into the preview, and use the shared cards on both surfaces.
- [ ] Run the focused test and confirm it passes.

### Task 2: Unsaved-change protection

**Files:**
- Create: `apps/web/src/features/site-editor/media/unsaved-media.ts`
- Modify: `apps/web/src/app/(crm)/crm/site/page.tsx`
- Modify: `apps/web/src/features/site-editor/media/SiteMediaBlocksEditor.tsx`
- Modify: `apps/web/src/features/site-editor/media/ImageCollectionEditor.tsx`
- Modify: `apps/web/src/features/site-editor/media/SingleImageEditor.tsx`
- Test: `apps/web/src/__tests__/image-collection.test.ts`
- Test: `apps/web/e2e/site-editor.spec.ts`

- [ ] Add failing tests for dirty-slot tracking and internal navigation confirmation.
- [ ] Run them and confirm failure because dirty state is currently local to child editors.
- [ ] Lift dirty state to the CRM page, install one `beforeunload` listener, and route all site-editor tab changes through a guarded navigation function.
- [ ] Clear only the saved slot after a successful save and rerun tests.

### Task 3: Undo removal

**Files:**
- Modify: `apps/web/src/features/site-editor/media/image-collection.ts`
- Modify: `apps/web/src/features/site-editor/media/ImageCollectionEditor.tsx`
- Modify: `apps/web/src/features/site-editor/media/SingleImageEditor.tsx`
- Test: `apps/web/src/__tests__/image-collection.test.ts`
- Test: `apps/web/e2e/site-editor.spec.ts`

- [ ] Add failing tests for restoring a removed collection item at its previous position and restoring a cleared single image.
- [ ] Run the tests and confirm the restore helper is missing.
- [ ] Add a single-operation undo banner that restores the removed value before save.
- [ ] Verify undo restores metadata, order, and the dirty state.

### Task 4: Complete media usage visibility

**Files:**
- Create: `apps/web/src/app/api/crm/media/media-usages.ts`
- Modify: `apps/web/src/app/api/crm/media/route.ts`
- Modify: `apps/web/src/features/site-editor/media/types.ts`
- Modify: `apps/web/src/features/site-editor/media/MediaLibraryPicker.tsx`
- Modify: `apps/web/src/app/(crm)/crm/site/page.tsx`
- Test: `apps/web/src/__tests__/media-api.test.ts`
- Test: `apps/web/e2e/site-editor.spec.ts`

- [ ] Add failing API tests requiring every listed file to include labeled site-block, course, and staff usages without personal data.
- [ ] Run the focused API test and confirm GET currently returns files without usages.
- [ ] Reuse one usage resolver in GET and DELETE, expose usage badges/details in both the picker and full media library, and make used/unused filters rely on server data.
- [ ] Run focused API and browser tests.

### Task 5: Verification and direct main publication

**Files:**
- Verify all files in the scoped diff.

- [ ] Run `npm run lint`.
- [ ] Run the full unit suite, separately documenting the unchanged baseline `parent-access.test.ts` failure and rerunning with only that file excluded.
- [ ] Run `npm --workspace apps/web run test:e2e -- site-editor.spec.ts --project=chromium`.
- [ ] Run `npm --workspace apps/web run build`.
- [ ] Review `git diff --check`, changed paths, and confirm no payment, MAX, invoice, parent, or demo files changed.
- [ ] Commit the scoped changes, rebase the new commit onto current `origin/main`, rerun the critical checks if the rebase changes content, and push `HEAD:main`.
