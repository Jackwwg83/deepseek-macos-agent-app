# AGENTS.md Product Guardrails for DeepSeek Agent

## Product scope

This repository is building a macOS-only DeepSeek Agent App. It uses DeepSeek-TUI as runtime sidecar/core. The product is DeepSeek-only.

## Do not drift

- Do not add non-DeepSeek providers.
- Do not add OpenAI/Codex model names to UI.
- Do not rewrite the DeepSeek-TUI runtime.
- Do not scrape terminal output.
- Do not implement fake macOS titlebar traffic lights inside the content UI.
- Do not leave visible buttons without actions.
- Do not use a large blue/purple gradient as the actual app content background.
- Do not trigger system login Keychain password prompts as part of normal API key flow.

## Required product behavior

Every visible control must be one of:

1. Wired and state-changing.
2. Disabled with a visible or inspectable reason.
3. Hidden when unavailable.

Demo Mode must always work without an API key.

## Required implementation habits

Before making changes:

- Inspect current code structure.
- Identify whether the code is SwiftUI, AppKit, WKWebView/React, or mixed.
- Identify missing handlers and static mock areas.

After making changes:

- Run build/test commands available in the repo.
- Exercise the Demo Mode journey.
- Update `PROGRESS.md` with what changed, what passed, and what remains.

## UI style

Use a Codex-inspired light macOS style:

- white/off-white surfaces
- translucent but subtle sidebar
- restrained blue accents
- clean typography
- rounded cards
- subtle borders
- clear disabled states

But keep it original and DeepSeek-native.
