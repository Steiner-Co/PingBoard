/**
 * The running version. Injected at build time from the git tag — the Docker
 * image sets `PINGBOARD_VERSION` from the release workflow (see the Dockerfile
 * ARG and .github/workflows/release.yml). Outside a tagged build it reads as
 * `0.0.0-dev`, so an unset version is obvious rather than pretending to be a
 * release.
 */
export const VERSION = process.env.PINGBOARD_VERSION || '0.0.0-dev'
