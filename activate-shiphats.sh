#!/usr/bin/env bash
set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
OUTPUT_DIR=$SCRIPT_DIR
FORCE=0
KEEP_INERT=0
NON_INTERACTIVE=0

usage() {
  cat <<'EOF'
Usage: ./activate-shiphats.sh [--non-interactive] [--force] [--keep-inert] [--output-dir DIR]

Interactive mode prompts for project-specific, non-secret values.
Non-interactive mode reads SHIPHATS_SONAR_PROJECT_KEY, SHIPHATS_CODEOWNERS,
SHIPHATS_NPM_REGISTRY, SHIPHATS_NODE_IMAGE, and SHIPHATS_PLAYWRIGHT_IMAGE.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --non-interactive) NON_INTERACTIVE=1 ;;
    --force) FORCE=1 ;;
    --keep-inert) KEEP_INERT=1 ;;
    --output-dir)
      shift
      [ "$#" -gt 0 ] || { echo "--output-dir needs a path" >&2; exit 2; }
      OUTPUT_DIR=$1
      ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

prompt_value() {
  variable_name=$1
  prompt=$2
  default_value=$3
  if [ "$NON_INTERACTIVE" -eq 1 ]; then
    eval "answer=\${$variable_name-}"
    [ -n "$answer" ] || answer=$default_value
  else
    printf '%s [%s]: ' "$prompt" "$default_value" >&2
    IFS= read -r answer || true
    [ -n "$answer" ] || answer=$default_value
  fi
  printf '%s' "$answer"
}

validate_no_whitespace() {
  label=$1
  value=$2
  case "$value" in
    *[[:space:]]*) echo "$label must not contain whitespace" >&2; exit 2 ;;
  esac
}

SONAR_PROJECT_KEY=$(prompt_value SHIPHATS_SONAR_PROJECT_KEY 'SonarQube project key' 'replace-me')
CODEOWNERS=$(prompt_value SHIPHATS_CODEOWNERS 'GitLab code owner (for example @group/team)' '@replace-me')
NPM_REGISTRY=$(prompt_value SHIPHATS_NPM_REGISTRY 'Nexus npm proxy' 'https://nexus.ship.gov.sg/repository/npm-proxy/')
NODE_IMAGE=$(prompt_value SHIPHATS_NODE_IMAGE 'Nexus Node 24 image' 'nexus-docker.ship.gov.sg/library/node:24-bookworm-slim')
PLAYWRIGHT_IMAGE=$(prompt_value SHIPHATS_PLAYWRIGHT_IMAGE 'Nexus Playwright image' 'nexus-docker-mcr.ship.gov.sg/playwright:v1.56.1-noble')

validate_no_whitespace 'SonarQube project key' "$SONAR_PROJECT_KEY"
validate_no_whitespace 'Code owner' "$CODEOWNERS"
validate_no_whitespace 'Npm registry' "$NPM_REGISTRY"
validate_no_whitespace 'Node image' "$NODE_IMAGE"
validate_no_whitespace 'Playwright image' "$PLAYWRIGHT_IMAGE"

SOURCES=(
  '.gitlab-ci.yml.shiphats'
  '.gitlab/ci/quality.gitlab-ci.yml.shiphats'
  'sonar-project.properties.shiphats'
  '.gitlab/CODEOWNERS.shiphats'
  '.gitlab/merge_request_templates/Default.md.shiphats'
)
TARGETS=(
  '.gitlab-ci.yml'
  '.gitlab/ci/quality.gitlab-ci.yml'
  'sonar-project.properties'
  '.gitlab/CODEOWNERS'
  '.gitlab/merge_request_templates/Default.md'
)

TEMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/shopper-shiphats.XXXXXX")
trap 'rm -rf "$TEMP_DIR"' EXIT HUP INT TERM

escape_sed() {
  printf '%s' "$1" | sed 's/[&|\\]/\\&/g'
}

render_file() {
  source_file=$1
  target_file=$2
  sed \
    -e "s|@@SHIPHATS_SONAR_PROJECT_KEY@@|$(escape_sed "$SONAR_PROJECT_KEY")|g" \
    -e "s|@@SHIPHATS_CODEOWNERS@@|$(escape_sed "$CODEOWNERS")|g" \
    -e "s|@@SHIPHATS_NPM_REGISTRY@@|$(escape_sed "$NPM_REGISTRY")|g" \
    -e "s|@@SHIPHATS_NODE_IMAGE@@|$(escape_sed "$NODE_IMAGE")|g" \
    -e "s|@@SHIPHATS_PLAYWRIGHT_IMAGE@@|$(escape_sed "$PLAYWRIGHT_IMAGE")|g" \
    "$source_file" > "$target_file"
}

i=0
while [ "$i" -lt "${#SOURCES[@]}" ]; do
  source_path=$SCRIPT_DIR/${SOURCES[$i]}
  rendered_path=$TEMP_DIR/${TARGETS[$i]}
  [ -f "$source_path" ] || { echo "Missing inert file: $source_path" >&2; exit 1; }
  mkdir -p "$(dirname -- "$rendered_path")"
  render_file "$source_path" "$rendered_path"
  i=$((i + 1))
done

if grep -R -E '@@SHIPHATS_[A-Z0-9_]+@@' "$TEMP_DIR" >/dev/null 2>&1; then
  echo 'Unknown or unresolved SHIP-HATS placeholder found; nothing was written.' >&2
  exit 1
fi

i=0
while [ "$i" -lt "${#TARGETS[@]}" ]; do
  destination=$OUTPUT_DIR/${TARGETS[$i]}
  if [ -e "$destination" ] && [ "$FORCE" -ne 1 ]; then
    echo "Refusing to overwrite $destination (use --force). Nothing was written." >&2
    exit 1
  fi
  i=$((i + 1))
done

i=0
while [ "$i" -lt "${#TARGETS[@]}" ]; do
  destination=$OUTPUT_DIR/${TARGETS[$i]}
  mkdir -p "$(dirname -- "$destination")"
  cp "$TEMP_DIR/${TARGETS[$i]}" "$destination"
  i=$((i + 1))
done

if [ "$OUTPUT_DIR" = "$SCRIPT_DIR" ] && [ "$KEEP_INERT" -ne 1 ]; then
  i=0
  while [ "$i" -lt "${#SOURCES[@]}" ]; do
    rm -f "$SCRIPT_DIR/${SOURCES[$i]}"
    i=$((i + 1))
  done
fi

cat <<EOF
SHIP-HATS files activated under: $OUTPUT_DIR

Configure these masked/protected project or group CI/CD variables in GitLab:
  CF_LEVEL (1-4, normally 4)
  SONAR_PROJECTKEY=$SONAR_PROJECT_KEY
  SONAR_TOKEN
  NEXUS_IQ_APP_ID, NEXUS_IQ_USERNAME, NEXUS_IQ_PASSWORD
  COSIGN_PASSWORD and FOD_PAT when their policy jobs are enabled

Then apply the WOG Pipeline Execution Policy, protect the default branch,
require merge-request approvals/code-owner approval, and verify runner access.
No credential belongs in these generated files.
EOF
