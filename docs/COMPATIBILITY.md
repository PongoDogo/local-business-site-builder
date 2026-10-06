# Compatibility and troubleshooting

The skill uses standard YAML frontmatter and keeps Codex-specific UI metadata in `agents/openai.yaml`. Other hosts can ignore that file. Copy the entire skill directory, not just SKILL.md.

## Missing skill

Confirm the path and reload the agent. Codex reads `~/.agents/skills`, Claude Code reads `~/.claude/skills`, Cursor reads `~/.cursor/skills`. For project installs, launch the agent in the matching project. The skill's name is `local-business-site-builder`.

## Permissions

Run the installer as your normal user. If the host blocks a destination, grant write access to its skills parent folder or use a project installation. Sandbox permission grants and operating-system ACLs are separate; a granted host permission may still fail if Windows refuses folder access. Do not run as administrator merely to hide a path/permission issue.

## Node in a restricted Codex sandbox

If Node returns EPERM from ancestor-directory `lstat` while loading a script, and the script itself is readable, try:

```sh
node --preserve-symlinks --preserve-symlinks-main install.mjs --dry-run
```

These flags avoid Node's normal entrypoint canonicalization. They do not grant filesystem permissions. The installer still verifies that its destination does not pass through symlinks. Request the needed directory access if it remains blocked.

## Runtime requirements

Most helper scripts need only Node 18+ or Deno. The distribution's installer/test runner uses Node. Browser rendering needs Chromium, Chrome or Edge and permission to launch it; Linux containers may have additional sandbox constraints. Set `BROWSER_PATH` to an existing executable. The installer never disables a browser sandbox or downloads a browser automatically.

FFmpeg is optional for installation and auditing but required by `images.mjs`. Network is optional for installation from an already-downloaded ZIP but required for online fonts, GitHub installation and live-site checks.

Hosted agents may not provide Node, browser automation, FFmpeg or hosting credentials. In such cases the skill's manual workflow remains usable, but unexecuted automated checks must be reported honestly.

## License

Original skill code and documentation are MIT. Bundled fonts retain their SIL Open Font License; keep their notice with redistributed font files. Sample business details are fictional. Legal and search-policy notes are dated guidance and require verification before use.
