#!/usr/bin/env bash
set -eu
force=no
keep=no
interactive=yes
output=.
while [ "$#" -gt 0 ]; do
  case "$1" in
    --force) force=yes ;;
    --keep-inert) keep=yes ;;
    --non-interactive) interactive=no ;;
    --output-dir) shift; output=${1:?Missing output directory} ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; exit 1 ;;
  esac
  shift
done
owner=${SHIPHATS_CODE_OWNER:-}
if [ "$interactive" = yes ]; then
  printf 'Code owner (@username or @group): '
  IFS= read -r owner
fi
case "$owner" in
  @?*) ;;
  *) printf 'SHIPHATS_CODE_OWNER must start with @\n' >&2; exit 1 ;;
esac
case "$owner" in
  *[!a-zA-Z0-9_@/.-]*) printf 'Invalid code owner\n' >&2; exit 1 ;;
esac
files=(.gitlab-ci.yml .gitlab/CODEOWNERS)
rendered=()
index=0
for file in "${files[@]}"; do
  [ "$force" = yes ] || [ ! -e "$output/$file" ] || { printf 'Refusing existing %s\n' "$output/$file" >&2; exit 1; }
  content=$(cat "$file.shiphats")
  content=${content//@@SHIPHATS_CODE_OWNER@@/$owner}
  case "$content" in *@@SHIPHATS_*@@*) printf 'Unknown placeholder in %s\n' "$file" >&2; exit 1 ;; esac
  rendered[$index]=$content
  index=$((index + 1))
done
index=0
for file in "${files[@]}"; do
  mkdir -p "$output/$(dirname "$file")"
  printf '%s\n' "${rendered[$index]}" > "$output/$file"
  index=$((index + 1))
done
if [ "$keep" = no ] && [ "$output" = . ]; then
  for file in "${files[@]}"; do rm "$file.shiphats"; done
fi
printf '%s\n' 'Activated. In GitLab configure protected main, required approvals/code owners,' 'agency runner/Nexus policies and the applicable compliance framework.' 'Extension only: no container signing/deployment jobs. No secrets belong in YAML.'
