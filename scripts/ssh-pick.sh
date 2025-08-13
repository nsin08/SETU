#!/usr/bin/env bash
# List & connect to hosts defined in an OpenSSH config, with Include support.
# Usage:
#   ./ssh-pick.sh                # uses ~/.ssh/my_ssh_config (then cdh_ssh_config, then ~/.ssh/config)
#   CONFIG=~/.ssh/cdh_ssh_config ./ssh-pick.sh
#   SSH_OPTS="-o Port=2222" ./ssh-pick.sh
#
# Notes:
# - Wildcard patterns (e.g., prod-*) are hidden by default. Set INCLUDE_PATTERNS=1 to show them.
# - Shows a short effective-config preview (HostName/User/Port/ProxyJump/IdentityFile) before connect.

set -Eeuo pipefail
shopt -s nocasematch nullglob

INCLUDE_PATTERNS="${INCLUDE_PATTERNS:-0}"

CONFIG="${CONFIG:-}"
if [[ -z "${CONFIG}" ]]; then
  if   [[ -f "$HOME/.ssh/my_ssh_config" ]]; then CONFIG="$HOME/.ssh/my_ssh_config"
  elif [[ -f "$HOME/.ssh/cdh_ssh_config" ]]; then CONFIG="$HOME/.ssh/cdh_ssh_config"
  else CONFIG="$HOME/.ssh/config"
  fi
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "Config not found: $CONFIG" >&2
  exit 1
fi

MAX_DEPTH=5
MAX_FILES=200

declare -a FILES=()
declare -A SEEN=()

strip_inline_comment() {
  local s="$*"
  s="${s%%#*}"
  printf '%s' "$s"
}

expand_include_glob() {
  local basefile="$1"; shift
  local base_dir; base_dir="$(dirname -- "$basefile")"
  local pattern
  for pattern in "$@"; do
    if [[ "$pattern" == ~* ]]; then
      pattern="${pattern/#\~/$HOME}"
    fi
    (
      cd "$base_dir" || exit
      shopt -s nullglob dotglob
      for m in $pattern; do
        if [[ "$m" = /* ]]; then
          printf '%s\0' "$m"
        else
          printf '%s\0' "$PWD/$m"
        fi
      done
    )
  done
}

collect_files() {
  local file="$1" depth="$2"
  if (( depth > MAX_DEPTH )); then
    echo "WARN: include depth>$MAX_DEPTH at $file" >&2
    return
  fi
  local abs; abs="$(readlink -f -- "$file" 2>/dev/null || python3 -c 'import os,sys;print(os.path.abspath(sys.argv[1]))' "$file")"
  if [[ ! -f "$abs" ]]; then
    echo "WARN: missing file: $abs" >&2
    return
  fi
  FILES+=("$abs")
  SEEN["$abs"]=1

  local line ln=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    ((ln++))
    line="$(strip_inline_comment "$line")"
    line="${line//$'\r'/}"
    [[ -z "$line" ]] && continue

    if [[ "$line" =~ ^[[:space:]]*[Ii]nclude[[:space:]]+(.+)$ ]]; then
      local patterns rest="${BASH_REMATCH[1]}"
      patterns=($rest)
      local inc
      while IFS= read -r -d '' inc; do
        if (( ${#FILES[@]} >= MAX_FILES )); then
          echo "WARN: include file cap $MAX_FILES exceeded; stopping at $inc" >&2
          return
        fi
        if [[ -z "${SEEN[$inc]+x}" ]]; then
          collect_files "$inc" $((depth+1))
        fi
      done < <(expand_include_glob "$abs" "${patterns[@]}")
    fi
  done < "$abs"
}

collect_files "$CONFIG" 1

declare -a TOKENS=()
declare -A TOKEN_SEEN=()

add_token() {
  local t="$1"
  [[ -z "$t" || "$t" == "*" || "$t" == \!* ]] && return
  if [[ "$INCLUDE_PATTERNS" != "1" ]] && [[ "$t" == *"*"* || "$t" == *"?"* ]]; then
    return
  fi
  if [[ -z "${TOKEN_SEEN[$t]+x}" ]]; then
    TOKENS+=("$t")
    TOKEN_SEEN["$t"]=1
  fi
}

parse_tokens() {
  local f line
  for f in "${FILES[@]}"; do
    while IFS= read -r line || [[ -n "$line" ]]; do
      line="$(strip_inline_comment "$line")"
      [[ -z "$line" ]] && continue
      if [[ "$line" =~ ^[[:space:]]*[Hh]ost[[:space:]]+(.+)$ ]]; then
        local rest=(${BASH_REMATCH[1]})
        for tok in "${rest[@]}"; do
          add_token "$tok"
        done
      fi
    done < "$f"
  done
}

parse_tokens

if ((${#TOKENS[@]} == 0)); then
  echo "No Host entries found in:"
  printf ' - %s\n' "${FILES[@]}"
  exit 1
fi

list_hosts() {
  echo
  local i=1
  for h in "${TOKENS[@]}"; do
    printf "%02d %s\n" "$i" "$h"
    ((i++))
  done
}

preview() {
  local alias="$1"
  if ! out="$(ssh -G -F "$CONFIG" "$alias" 2>/dev/null)"; then
    echo "Preview (ssh -G) failed for '$alias'."
    return
  fi
  declare -A kv=()
  while IFS= read -r ln; do
    [[ "$ln" =~ ^([A-Za-z][A-Za-z0-9]+)[[:space:]]+(.*)$ ]] || continue
    key="${BASH_REMATCH[1],,}"
    kv["$key"]="${BASH_REMATCH[2]}"
  done <<< "$out"

  echo "Effective (ssh -G -F $CONFIG $alias):"
  printf "  HostName:     %s\n" "${kv[hostname]:-}"
  printf "  User:         %s\n" "${kv[user]:-}"
  printf "  Port:         %s\n" "${kv[port]:-}"
  printf "  ProxyJump:    %s\n" "${kv[proxyjump]:-}"
  printf "  IdentityFile: %s\n" "${kv[identityfile]:-}"
}

while true; do
  list_hosts
  read -r -p "Select 1-${#TOKENS[@]} (or 'q' to quit): " input
  case "$input" in
    q|Q) exit 0 ;;
    ''|*[!0-9]*) echo "Invalid input."; continue ;;
    *)
      sel=$((10#$input))
      if (( sel < 1 || sel > ${#TOKENS[@]} )); then
        echo "Out of range."
        continue
      fi
      idx=$((sel-1))
      alias="${TOKENS[$idx]}"
      echo -e "\n>> ${alias}"
      preview "$alias"
      echo
      echo "Connecting with: ssh -F \"$CONFIG\" ${SSH_OPTS:-} \"$alias\""
      exec ssh -F "$CONFIG" ${SSH_OPTS:-} "$alias"
      ;;
  esac
done
