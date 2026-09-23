# NewLight Internal client-shell migration

## Goal
Move NewLight Internal into the same ten-module client workspace shell used by every sub-account, while preserving the separate admin portal and all existing tenant scoping.

## Implementation
1. **Use the standard workspace entry path**
   - Keep NewLight Internal as the existing `newlight-internal` client record.
   - Continue using the established admin “open workspace” action, which sets the active client and opens the standard dashboard through `AppLayout` and `AppSidebar`.
   - Preserve the visible “Admin” return control and workspace switcher for administrators.

2. **Activate Client Overview only for NewLight Internal**
   - Keep Client Overview as one of the same ten top-level modules.
   - For NewLight Internal, expose four sub-items inside that module: Business Health, Revenue Opportunities, Priority Actions, and Live Activity Feed.
   - Reuse the existing four workspace-scoped screens and their existing `activeClientId` queries; provide a clean tab/view experience under `/client-overview` without duplicating data logic.
   - For every other workspace, keep the current Coming Soon placeholder and do not expose those four internal views.

3. **Retire the mirrored operations shell**
   - Remove `opsGroups` and the “NewLight Operations” section from the admin sidebar, leaving the true admin modules unchanged.
   - Remove the `/admin/ops/*` route registrations.
   - Remove the old context override provider after moving its shared internal-workspace ID/name constants to a neutral utility module.
   - Update remaining branding, webinar, manifest, and calendar imports to use that neutral constant; their behavior remains unchanged.
   - Remove obsolete `/admin/ops/*` entries from admin module search so no dead navigation remains.

4. **Preserve boundaries**
   - Do not alter database policies, permissions, tenant filters, or query scoping.
   - Do not modify unrelated admin modules or begin the broader Phase 3 cleanup.

## Verification
- Confirm the NewLight Internal record still opens from the existing admin client-management flow into `/dashboard` using `AppLayout` and the exact ten-module `AppSidebar`.
- Confirm Client Overview shows all four live views only when the active client is NewLight Internal, and remains Coming Soon for another workspace.
- Confirm the four views still query the active NewLight client ID.
- Confirm no source references remain to `AdminOpsProvider`, `opsGroups`, or `/admin/ops/*`.
- Run focused tests, TypeScript checks, lint checks, and browser checks for the admin-to-workspace transition and both Client Overview states.
