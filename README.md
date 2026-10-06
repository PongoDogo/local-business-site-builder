# Local Business Site Builder

A portable Agent Skill for building and auditing static websites for local businesses in Greece. Includes Greek content guidance, facts-driven scaffolding, local SEO, consent templates, Hostinger deployment guidance and a dependency-free site auditor.

**Author:** PongoDogo · **License:** MIT · **Version:** 1.0.0

## Quick install from GitHub

After this repository is published, install with the open-source [skills CLI](https://github.com/vercel-labs/skills):

```sh
npx skills add PongoDogo/local-business-site-builder --skill local-business-site-builder
```

The CLI lets you select agents and scope. For user-wide Codex and Claude Code:

```sh
npx skills add PongoDogo/local-business-site-builder --skill local-business-site-builder -a codex -a claude-code -g -y --copy
```

The skills CLI is a third-party installer; its agent integrations are maintained upstream. Use the local installer below if you prefer complete copies and no npm dependencies.

## Local install: Windows, macOS, Linux

Download this repository as a ZIP and extract it, or clone it:

```sh
git clone https://github.com/PongoDogo/local-business-site-builder.git
cd local-business-site-builder
node install.mjs
node doctor.mjs
```

`node install.mjs` copies the **entire skill** into your personal Codex and Claude Code folders. It requires Node 18+ but no `npm install`, Deno, symlinks, administrator rights or API key. Use a currently supported Node release when setting up a new machine.

| Agent | Command | Personal destination |
|---|---|---|
| Codex | `node install.mjs --agents codex` | `~/.agents/skills/local-business-site-builder` |
| Claude Code | `node install.mjs --agents claude` | `~/.claude/skills/local-business-site-builder` |
| Cursor | `node install.mjs --agents cursor` | `~/.cursor/skills/local-business-site-builder` |
| All three | `node install.mjs --agents codex,claude,cursor` | All destinations above |
| Other Agent Skills host | `node install.mjs --dest "PATH_TO_SKILLS_FOLDER"` | `PATH_TO_SKILLS_FOLDER/local-business-site-builder` |

For a single project, add `--project "PATH_TO_PROJECT"`. For another agent, consult its documentation to find the skill directory; copying to `.agents/skills` alone does not prove that every agent discovers it. The upstream skills CLI provides a broader set of agent adapters.

Preview destinations: `node install.mjs --dry-run`.

## Claude web / desktop

Download `local-business-site-builder.zip` from the release, then upload it through **Customize → Skills** in Claude. The archive contains one `local-business-site-builder/` folder with `SKILL.md`, scripts, references, templates and font licenses. Do not upload the full repository ZIP as a skill.

Claude account availability and execution capabilities depend on the product and plan. Uploading a ZIP does not install Node, Chromium or FFmpeg into Claude's environment. The skill checks capabilities and uses manual checks when execution tools are unavailable.

## Use

Codex: `$local-business-site-builder` followed by your request.

Claude Code: `/local-business-site-builder` followed by your request.

Example: «Φτιάξε ιστοσελίδα για ηλεκτρολόγο στο Περιστέρι. Πρώτα ζήτησέ μου τα στοιχεία που χρειάζεσαι.»

The skill collects verified business facts, proposes a design, builds static HTML/CSS/JS, audits the result and supplies deployment instructions. It also handles audit-only tasks. No hosting account or paid AI API is bundled.

## Requirements and compatibility

| Capability | Requirement |
|---|---|
| Read instructions / manual workflow | Agent supporting Agent Skills and access to supporting files |
| Scaffold, audit, contrast and version tools | Node 18+ or compatible Deno, terminal and file access |
| Icons and OG image rendering | Edge, Chrome or Chromium; set `BROWSER_PATH` if not detected |
| WebP image helper | FFmpeg on PATH, or equivalent agent image tooling |
| Live site / font checks | Network access allowed by the host |
| Responsive and consent QA | Browser tooling in the agent |
| Deployment | Owner-authorized access to hosting |

`doctor.mjs` reports missing optional tools and executes the bundled sample audit. It does not install software or contact a hosting account.

**Verified locally:** Windows, Node 24, installer tests, sample audit and scaffold checks. **CI configured:** Windows/macOS/Linux with Node 18/22/24. Those combinations are not marked passed until GitHub Actions actually runs. Agent UI discovery and hosted Claude execution must be checked in their respective products; no universal functionality guarantee is claimed.

## Updates

Download/clone the newer release and run:

```sh
node install.mjs --update
```

Unchanged copies are skipped. Managed updates keep the previous installation in `agent-skill-backups/` next to the agent's `skills/` parent, outside skill discovery. Modified or unmanaged installations are not overwritten: move your backup outside the agent's scanned skills directory, then install afresh. Identical installations made by another installer are safe to leave in place. Each destination is staged separately; if a later destination fails, successful earlier installations remain and can be safely retried.

For installations managed by the skills CLI, use that CLI's update workflow. Avoid mixing installers for the same modified copy.

## Development

```sh
npm test
npm run validate
npm run doctor
npm run package
```

No npm dependencies are needed. `skills/local-business-site-builder/` is the single source for installable files. Release ZIPs contain only that folder; fixtures and private client data from the original development workspace are not distributed.

See [compatibility notes](docs/COMPATIBILITY.md), [release checklist](docs/RELEASING.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

Official discovery references: [Codex](https://learn.chatgpt.com/docs/build-skills), [Claude Code](https://code.claude.com/docs/en/skills), [Claude ZIP upload](https://support.claude.com/en/articles/12512180-use-skills-in-claude), [Cursor](https://cursor.com/docs/skills).
