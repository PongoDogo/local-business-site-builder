# Release checklist

1. Update `package.json` version and changelog.
2. Run tests, validator, doctor and package commands. Inspect the ZIP for a single skill root and no customer data.
3. Push the repository and wait for the cross-platform GitHub Actions matrix.
4. Tag a release, for example `v1.0.0`, only after checks pass. Attach `local-business-site-builder.zip` and `SHA256SUMS.txt`; the `.skill` copy is optional.
5. Test installation from the published repository with `npx skills add PongoDogo/local-business-site-builder --skill local-business-site-builder` in a disposable project.
6. Check discovery in actual Codex, Claude Code and Cursor sessions. Check ZIP upload in Claude separately. Do not describe untested hosts as verified.

The standard `skills/NAME/SKILL.md` layout is discoverable by the upstream skills CLI. A GitHub release and installs through that CLI make the repository shareable; search ranking or inclusion in third-party catalogs is not guaranteed. The first successful published installation must be verified before advertising the command as tested.
