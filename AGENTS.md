# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- Don't switch the `app`, `worker` or `scheduler` daemons to the image's `start-container`
  entrypoint: each would start its own supervisord on `127.0.0.1:9001`, and every daemon in this
  package shares one network namespace.
- Apply account changes through the app (`applyAdmin` and `ensureClients` in `startos/utils.ts`
  run PHP inside a booted solidtime), never by writing rows or hashes into PostgreSQL directly.
