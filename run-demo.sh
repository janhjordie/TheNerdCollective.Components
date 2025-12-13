#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Starting MudQuillEditor demo from $ROOT_DIR"

PROJECT_PATH_ROOT="$ROOT_DIR/TheNerdCollective.MudQuillEditor.Demo/TheNerdCollective.MudQuillEditor.Demo.csproj"
PROJECT_PATH_SRC="$ROOT_DIR/src/TheNerdCollective.MudQuillEditor.Demo/TheNerdCollective.MudQuillEditor.Demo.csproj"

if [ -f "$PROJECT_PATH_ROOT" ]; then
  echo "Using demo project at $PROJECT_PATH_ROOT"
  dotnet run --project "$PROJECT_PATH_ROOT"
elif [ -f "$PROJECT_PATH_SRC" ]; then
  echo "Using demo project at $PROJECT_PATH_SRC"
  dotnet run --project "$PROJECT_PATH_SRC"
else
  echo "Demo project not found. Checked:"
  echo "  $PROJECT_PATH_ROOT"
  echo "  $PROJECT_PATH_SRC"
  exit 1
fi
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Starting MudQuillEditor demo from $ROOT_DIR"

PROJECT_PATH="$ROOT_DIR/src/TheNerdCollective.MudQuillEditor.Demo/TheNerdCollective.MudQuillEditor.Demo.csproj"
if [ ! -f "$PROJECT_PATH" ]; then
  echo "Demo project not found at $PROJECT_PATH"
  exit 1
fi

dotnet run --project "$PROJECT_PATH"
