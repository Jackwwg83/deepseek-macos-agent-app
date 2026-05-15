# Codex Goal — Implement DeepSeek Agent macOS App UI/UX v2

## Goal

Implement the v2 DeepSeek Agent macOS App UI using the design package in `design/deepseek_agent_app_uiux_product_pack_v2/` or the current repository root, depending on where these files are copied.

The app must become a polished macOS-only DeepSeek Agent command center, using DeepSeek-TUI as runtime core and matching the Codex-inspired light visual system shown in the mockups.

## Outcome

By the end of this goal, the repository should contain a locally launchable MVP that supports:

1. First Run Setup.
2. Project Command Center.
3. Active Thread timeline.
4. Review Changes / diff review.
5. Settings & Usage.
6. Demo Mode via FakeRuntimeAdapter.
7. RuntimeAdapter abstraction for DeepSeek-TUI sidecar.
8. A visual system matching `docs/03_VISUAL_SYSTEM.md` and mockups.

## Hard constraints

- Use DeepSeek-TUI as runtime core; do not reimplement agent loop.
- Only support DeepSeek models in UI: `deepseek-v4-flash`, `deepseek-v4-pro`.
- Do not add multi-provider UI.
- Do not fork or copy OpenBridge/Codex code.
- Do not put DeepSeek URL/API key forms in the main workspace screen.
- Do not use the old black/yellow visual style.
- Do not store API keys in React localStorage/sessionStorage.
- Preserve fake runtime/demo mode throughout the implementation.

## Visual target

Use the mockups as visual references:

- `mockups/01_active_thread_review.png`
- `mockups/02_first_run_setup.png`
- `mockups/03_project_command_center.png`
- `mockups/04_review_changes.png`
- `mockups/05_settings_usage.png`

Key style requirements:

- Soft blue-lilac gradient wallpaper.
- Rounded macOS window with traffic lights.
- Translucent pale sidebar.
- White floating cards.
- Fine gray borders and subtle shadows.
- Slate typography.
- Restrained blue accent.
- Green/red only for semantic status/diff.

## Implementation order

1. Read all docs in this package.
2. Create or update design tokens using `tokens/design-tokens.css` / JSON.
3. Build layout shell: sidebar, main, inspector.
4. Implement FakeRuntimeAdapter and fixtures.
5. Implement First Run Setup.
6. Implement Project Command Center.
7. Implement Active Thread.
8. Implement Review Changes.
9. Implement Settings & Usage.
10. Add RuntimeAdapter real sidecar skeleton.
11. Add tests and screenshot/smoke checks.
12. Update implementation progress notes.

## Verification

Run all applicable commands for the project. If the repository has no established test command, create a simple smoke test or document the manual run command.

Minimum checks:

- App launches locally.
- Demo mode works without API key.
- New thread creates a fake thread.
- Active Thread displays fake streaming timeline.
- Review Changes displays fake diff and file review state.
- Settings uses DeepSeek-only model names.
- Main screen no longer shows API URL/API key forms.
- UI roughly matches the v2 mockups.

## Stop condition

Continue iterating until either:

1. The MVP can be launched locally and all acceptance checks pass, or
2. There is a concrete blocker that cannot be resolved without external credentials, missing project files, or unavailable tools.

If blocked, write a precise blocker report including:

- what was attempted,
- exact error/output,
- what file or dependency is missing,
- what the next human action should be.

