Important Copilot Instructions

- Do not create new terminals. If an operation fails due to a port conflict or "address already in use" message, this indicates another terminal/process is already running and using the port.
- If you encounter such an error, do NOT attempt to spawn or kill processes yourself. Instead, immediately notify me with the exact error message so I can stop the existing process manually.

## Trusted Publishing & NuGet Publishing (COMPLETE GUIDE)

**CRITICAL: All NuGet package publishing MUST use Trusted Publishing (OIDC) via GitHub Actions. This is the ONLY supported approach.**

### ✅ COMPLETE CORRECT WORKFLOW PATTERN (ALWAYS USE THIS):

```yaml
name: Publish Package Name

on:
  push:
    branches:
      - main

permissions:
  contents: write
  id-token: write  # Required for OIDC token

jobs:
  publish-package:
    runs-on: ubuntu-latest
    environment: production  # Required for OIDC
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'

      - name: Get Version from csproj
        id: version
        run: |
          VERSION=$(grep -oP '<Version>\K[^<]+' src/Package/Package.csproj | head -1)
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Restore
        run: dotnet restore src/Package

      - name: Build
        run: dotnet build src/Package -c Release --no-restore

      - name: Pack
        run: dotnet pack src/Package -c Release -o artifacts --no-build

      - name: Get OIDC Token
        id: oidc
        uses: actions/github-script@v7
        with:
          script: |
            const token = await core.getIDToken('https://api.nuget.org/v3/index.json');
            core.setSecret(token);
            core.setOutput('token', token);

      - name: Configure NuGet
        run: dotnet nuget add source https://api.nuget.org/v3/index.json -n nuget.org 2>/dev/null || true

      - name: Push to NuGet
        env:
          NUGET_TOKEN: ${{ steps.oidc.outputs.token }}
        run: |
          set -e
          for nupkg in artifacts/*.nupkg; do
            dotnet nuget push "$nupkg" -s https://api.nuget.org/v3/index.json -k "$NUGET_TOKEN" --skip-duplicate || true
          done

      - name: Create Git Tag
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git tag -a "package-v${{ steps.version.outputs.version }}" -m "Package ${{ steps.version.outputs.version }}"
          git push origin "package-v${{ steps.version.outputs.version }}"
```

### ❌ NEVER use these approaches:
- `NuGet/login@v1` action - incompatible with OIDC
- `${{ secrets.NUGET_PUBLISH_KEY }}` as environment variable
- Any hardcoded API keys in workflows
- `--api-key` parameter alone (MUST use `-s` with `-k`)
- v2 API endpoints (use v3: `https://api.nuget.org/v3/index.json`)

### CRITICAL Implementation Details:

1. **OIDC Token Retrieval (MUST USE)**:
   ```yaml
   - name: Get OIDC Token
     id: oidc
     uses: actions/github-script@v7  # REQUIRED: Must be v7 or later
     with:
       script: |
         const token = await core.getIDToken('https://api.nuget.org/v3/index.json');
         core.setSecret(token);  # REQUIRED: Masks token in logs
         core.setOutput('token', token);
   ```

2. **Configure NuGet Source (PREVENTS v2 API FALLBACK)**:
   ```yaml
   - name: Configure NuGet
     run: dotnet nuget add source https://api.nuget.org/v3/index.json -n nuget.org 2>/dev/null || true
   ```
   **WHY**: GitHub Actions runners have a default NuGet.config with v2 API. This step explicitly registers v3.

3. **NuGet.config at Repository Root (MANDATORY)**:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <configuration>
     <packageSources>
       <clear />
       <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
     </packageSources>
   </configuration>
   ```
   **WHY**: Without this, dotnet defaults to v2 API and causes 403 Forbidden errors.

4. **Push Command (WITH ERROR HANDLING)**:
   ```bash
   set -e  # Exit on error
   for nupkg in artifacts/*.nupkg; do
     dotnet nuget push "$nupkg" \
       -s https://api.nuget.org/v3/index.json \
       -k "$NUGET_TOKEN" \
       --skip-duplicate || true  # Allow failure on duplicate
   done
   ```
   **Key flags**:
   - `-s` = source (REQUIRED, must be v3)
   - `-k` = API key (use OIDC token)
   - `--skip-duplicate` = ignore existing versions
   - `|| true` = ignore errors on duplicate packages

5. **Permissions in Workflow (REQUIRED)**:
   ```yaml
   permissions:
     contents: write      # For git tag creation
     id-token: write      # FOR OIDC TOKEN - DO NOT OMIT
   ```

6. **Production Environment (REQUIRED)**:
   ```yaml
   jobs:
     publish:
       environment: production  # Links to GitHub OIDC trust configuration
   ```

### Common Failure Patterns & Fixes:

| Error | Cause | Fix |
|-------|-------|-----|
| `403 Forbidden` | Using v2 API | Add `Configure NuGet` step + check NuGet.config |
| `401 Unauthorized` | Invalid/missing API key | Check OIDC token retrieval step, verify `id-token: write` permission |
| `400 Bad Request` | Missing `-s` flag | Always use `-s https://api.nuget.org/v3/index.json` |
| Workflow fails on duplicate | Missing `|| true` | Add `|| true` to allow re-runs |
| Token error in logs | Token not masked | Add `core.setSecret(token)` in OIDC step |

## Release Workflows

### ✅ SIMPLIFIED: All Publishing is Automatic

**To publish a new version:**
1. Bump the `<Version>` in the package's `.csproj` file
2. Commit: `git commit -m "chore: bump <PackageName> to vX.Y.Z - <description>"`
3. Push: `git push origin main`
4. **Done!** GitHub Actions automatically:
   - Builds the package (`dotnet build` and `dotnet pack`)
   - Publishes to NuGet using OIDC trusted publishing
   - Creates git tags matching the version (e.g., `package-name-vX.Y.Z`)

**That's it.** No manual building, tagging, or pushing required. The workflows handle everything.

---

### Detailed Workflow References (For Reference Only)

When user says "release MudComponent", "release Services", "release Components", or "release Helpers", simply:

### Release MudComponent (TheNerdCollective.MudComponents.MudQuillEditor)
1. Bump version in: `src/TheNerdCollective.MudComponents.MudQuillEditor/TheNerdCollective.MudComponents.MudQuillEditor.csproj`
2. Commit: `git commit -m "chore: bump MudQuillEditor to vX.Y.Z - <description>"`
3. Push: `git push origin main`
4. ✅ Workflow automatically publishes and tags


### Release Services (TheNerdCollective.Services)
### Release Services (TheNerdCollective.Services)
1. Bump version in: `src/TheNerdCollective.Services/TheNerdCollective.Services.csproj`
2. Commit: `git commit -m "chore: bump Services to vX.Y.Z - <description>"`
3. Push: `git push origin main`
4. ✅ Workflow automatically publishes and tags

### Release Components (TheNerdCollective.Components)
1. Bump version in: `src/TheNerdCollective.Components/TheNerdCollective.Components.csproj`
2. Commit: `git commit -m "chore: bump Components to vX.Y.Z - <description>"`
3. Push: `git push origin main`
4. ✅ Workflow automatically publishes and tags

### Release Helpers (TheNerdCollective.Helpers)
1. Bump version in: `src/TheNerdCollective.Helpers/TheNerdCollective.Helpers.csproj`
2. Commit: `git commit -m "chore: bump Helpers to vX.Y.Z - <description>"`
3. Push: `git push origin main`
4. ✅ Workflow automatically publishes and tags

**Note:** Replace X.Y.Z with actual version number and <description> with meaningful release description. Always ask user for the version and description if not provided.

### ⚠️ When Creating New Packages

**IMPORTANT:** When you create a new NuGet package in this repository, you MUST also add it to the GitHub Actions workflow:

1. Open `.github/workflows/publish-packages.yml`
2. Find the `declare -A PACKAGES=(` section
3. Add a new line: `["PackageName"]="src/PackageName"`
4. Commit the workflow change along with the new package

Without this step, the package will NOT be automatically published to NuGet!

### 🔄 If Publishing Fails:
Simply bump the patch version again:
```
// In package.csproj
<Version>X.Y.Z+1</Version>
```
Then commit and push. Workflow re-runs automatically and retries publishing.
