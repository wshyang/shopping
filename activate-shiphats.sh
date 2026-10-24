#!/bin/bash
set -eu
# activate-shiphats.sh — turns inert SHIP-HATS files active (GREENFIELD §10.3)
# Bash 3.2 compatible: no associative arrays, no mapfile, no ${var,,}
# Usage: ./activate-shiphats.sh [--non-interactive] [--force] [--keep-inert]

FORCE=""
KEEP_INERT=""
NON_INTERACTIVE=""

for arg in "$@"; do
  case "$arg" in
    --force) FORCE="1" ;;
    --keep-inert) KEEP_INERT="1" ;;
    --non-interactive) NON_INTERACTIVE="1" ;;
    --help|-h)
      echo "Usage: $0 [--non-interactive] [--force] [--keep-inert]"
      echo "  --non-interactive  read SHIPHATS_* env vars instead of prompting"
      echo "  --force            overwrite existing active files"
      echo "  --keep-inert       keep *.shiphats copies after activation"
      exit 0
      ;;
  esac
done

prompt_value() {
  # $1 = var name, $2 = prompt text, $3 = default
  _var_name="$1"
  _prompt_text="$2"
  _default="$3"
  _env_val=""
  if [ "$NON_INTERACTIVE" = "1" ]; then
    eval "_env_val=\${SHIPHATS_${_var_name}+set}"
    if [ "$_env_val" = "set" ]; then
      eval "_env_val=\$SHIPHATS_${_var_name}"
      echo "$_env_val"
      return
    fi
    if [ -n "$_default" ]; then
      echo "$_default"
      return
    fi
    echo "Missing SHIPHATS_${_var_name} in non-interactive mode" >&2
    exit 1
  fi
  printf "%s [%s]: " "$_prompt_text" "$_default"
  read -r _input
  if [ -z "$_input" ]; then
    echo "$_default"
  else
    echo "$_input"
  fi
}

render_file() {
  # $1 = source, $2 = dest
  _src="$1"
  _dest="$2"
  _tmp="${_dest}.tmp"
  cp "$_src" "$_tmp"

  # Replace placeholders — add more as needed
  _cf_level=""
  _cf_level=$(prompt_value "CF_LEVEL" "Compliance level (1-4)" "4")
  _sonar_key=""
  _sonar_key=$(prompt_value "SONAR_PROJECTKEY" "SonarQube project key" "@@SHIPHATS_SONAR_PROJECTKEY@@")
  _nexus_app=""
  _nexus_app=$(prompt_value "NEXUS_IQ_APP_ID" "Nexus IQ app ID" "@@SHIPHATS_NEXUS_IQ_APP_ID@@")

  # Use perl for in-place replacement to handle special chars
  perl -i -pe "s/\@\@SHIPHATS_CF_LEVEL\@\@/${_cf_level}/g; s/\@\@SHIPHATS_SONAR_PROJECTKEY\@\@/${_sonar_key}/g; s/\@\@SHIPHATS_NEXUS_IQ_APP_ID\@\@/${_nexus_app}/g" "$_tmp"

  # Check for unknown placeholders
  if grep -q "@@SHIPHATS_" "$_tmp"; then
    echo "Unknown placeholder remains in $_tmp" >&2
    grep "@@SHIPHATS_" "$_tmp" >&2
    rm -f "$_tmp"
    exit 1
  fi

  if [ -f "$_dest" ] && [ -z "$FORCE" ]; then
    echo "Refusing to overwrite $_dest (use --force)" >&2
    rm -f "$_tmp"
    exit 1
  fi

  mv "$_tmp" "$_dest"
  echo "Rendered $_dest"
}

# Discover inert files
_INERT_FILES=""
for f in .gitlab-ci.yml.shiphats .gitlab/ci/*.gitlab-ci.yml.shiphats sonar-project.properties.shiphats .gitlab/CODEOWNERS.shiphats .gitlab/merge_request_templates/Default.md.shiphats; do
  if [ -f "$f" ]; then
    _INERT_FILES="$_INERT_FILES $f"
  fi
done

if [ -z "$_INERT_FILES" ]; then
  echo "No inert files found (*.shiphats)"
  exit 0
fi

# Render all before writing any (validate first)
for src in $_INERT_FILES; do
  dest=$(echo "$src" | sed 's/\.shiphats$//')
  echo "Will render $src -> $dest"
done

for src in $_INERT_FILES; do
  dest=$(echo "$src" | sed 's/\.shiphats$//')
  render_file "$src" "$dest"
done

if [ -z "$KEEP_INERT" ]; then
  for src in $_INERT_FILES; do
    rm -f "$src"
    echo "Removed inert $src"
  done
fi

echo ""
echo "Activation complete. Configure these GitLab settings manually:"
echo "  - Project CI/CD variables: CF_LEVEL, SONAR_PROJECTKEY, SONAR_TOKEN, NEXUS_IQ_APP_ID, NEXUS_IQ_USERNAME, NEXUS_IQ_PASSWORD"
echo "  - Compliance framework (WOG Security Policy Project) and branch protection"
echo "  - Code owners (see CODEOWNERS)"
