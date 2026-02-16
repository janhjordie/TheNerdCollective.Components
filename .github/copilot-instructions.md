# TheNerdCollective.Components - AI Copilot Instructions

## Project Overview

**TheNerdCollective.Components** is a .NET 10+ monorepo containing **6 independent NuGet packages** organized by domain:

- **UI/Component Packages**: MudQuillEditor (rich-text editor), MudComponents base
- **Infrastructure Packages**: Services (Azure Blob, DI extensions), Helpers (utility methods)
- **Integration Packages**: Harvest (timesheet API), GitHub (workflow management), AzurePipelines (pipeline management)
- **Blazor Utilities**: Reconnect (circuit reconnection UI), VersionMonitor (update detection), BlazorServerCircuitHandler (deprecated)

**Key Architecture Pattern**: Each package is independently versioned and published to NuGet. Packages have clear domain boundaries and can be adopted individually.

---

## Essential Commands

```bash
# Demo Application (Blazor Server showcase)
cd src/TheNerdCollective.Demo && dotnet run
# Runs on https://localhost:5001

# Build entire solution
dotnet build

# Run specific package tests (if added)
dotnet test

# Pack a specific package locally
dotnet pack src/TheNerdCollective.Services -c Release
```

---

## Critical: NuGet Publishing Workflow

**All publishing MUST use Trusted Publishing (OIDC) via GitHub Actions—NO manual API keys.**

### To Release a Package:

1. **Update version** in the package's `.csproj` file (e.g., `src/TheNerdCollective.Services/TheNerdCollective.Services.csproj`)
2. **Commit & push**:
   ```bash
   git commit -m "chore: bump <PackageName> to vX.Y.Z - <description>"
   git push origin main
   ```
3. ✅ **Done!** GitHub Actions automatically:
   - Builds the package (`dotnet build` + `dotnet pack`)
   - Publishes to NuGet using OIDC token
   - Creates git tag (e.g., `package-name-vX.Y.Z`)

### Workflow Details:

- **File**: `.github/workflows/publish-packages.yml`
- **Trigger**: Any commit to `main` branch (matrix builds all packages)
- **Critical files**:
  - `NuGet.config` at repo root (defines v3 API endpoint)
  - Each package's `.csproj` file (extracts `<Version>` tag)

### When Creating New Packages:

**MUST update** `.github/workflows/publish-packages.yml`:
1. Find the `declare -A PACKAGES=(` section
2. Add: `["NewPackageName"]="src/NewPackageName"`
3. Commit the workflow change WITH the package creation

Without this, the new package won't auto-publish to NuGet!

### Version Bumping Strategy (Semantic Versioning)

**Standard semver format**: `MAJOR.MINOR.PATCH` (e.g., `1.0.5`, `2.1.0`)

**When to bump each component:**

| Situation | Bump Type | Example | Details |
|-----------|-----------|---------|---------|
| **Breaking API changes** | MAJOR | 1.0.0 → 2.0.0 | Method signature changes, removed public APIs, output format changes |
| **New features, non-breaking** | MINOR | 1.0.0 → 1.1.0 | New public methods, new parameters (optional), new capabilities like Polly retry policies |
| **Bug fixes, docs, internal changes** | PATCH | 1.0.0 → 1.0.1 | Bug fixes, XML documentation, internal refactoring, improved error handling |

**How to bump versions:**

1. **Identify affected packages** - Which packages changed? (e.g., GitHub, Harvest, AzurePipelines integration services)

2. **Determine semantic version** - Review what changed:
   ```
   ✅ New Polly retry policies = MINOR bump (1.0.1 → 1.1.0)
   ✅ XML API documentation only = PATCH bump (1.0.0 → 1.0.1)
   ✅ Breaking API changes = MAJOR bump (1.0.0 → 2.0.0)
   ```

3. **Update each package's `.csproj` file**:
   ```xml
   <Version>1.1.0</Version>
   ```
   Location: `src/TheNerdCollective.Integrations.GitHub/TheNerdCollective.Integrations.GitHub.csproj`

4. **Create single commit with all version bumps**:
   ```bash
   # When bumping multiple packages
   git add -A
   git commit -m "chore: bump integration packages to 1.1.0
   
   Changes:
   - TheNerdCollective.Integrations.GitHub: 1.0.1 → 1.1.0
   - TheNerdCollective.Integrations.Harvest: 1.0.20 → 1.1.0
   - TheNerdCollective.Integrations.AzurePipelines: 1.0.1 → 1.1.0
   
   Reasons:
   ✅ #2-CR: Polly retry policies with exponential backoff
   ✅ #5-REC: Comprehensive XML API documentation"
   ```

5. **Push to main**:
   ```bash
   git push origin main
   ```
   ✅ GitHub Actions will build and publish all changed packages

**Pro tips:**

- ⚠️ **Document breaking changes** in commit message for MAJOR bumps
- ✅ **Group related bumps** - If multiple packages change together, bump in same commit
- 📋 **Track in action list** - Update `docs/00-nerd-rules-recommendations/nerd_rules_action_list_*.md` with completed work
- 🔍 **Verify versions** - Use `grep_search` to find all `<Version>` tags before committing
- ⏱️ **Monitor publishing** - Check GitHub Actions run and NuGet.org within minutes


---

## Project Structure & Package Domains

### 1. **TheNerdCollective.Components** (Umbrella Package)
- **Role**: Main entry point, bundles MudQuillEditor + utilities
- **Key File**: `src/TheNerdCollective.Components/TheNerdCollective.Components.csproj`
- **Pattern**: ProjectReference-based composition (includes MudQuillEditor)

### 2. **TheNerdCollective.MudComponents.MudQuillEditor** (Rich-Text Editor)
- **Framework**: Blazor Server/WASM-compatible
- **JS Integration**: Quill 2.0 (in `wwwroot/js/mudquilleditor.js`)
- **Data Binding**: Two-way binding with `@bind-Value`
- **Theme Support**: Auto-adapts to MudBlazor dark/light themes
- **Pattern**: C# wrapper around JavaScript Quill library + CSS theming

### 3. **TheNerdCollective.Helpers** (Utility Library)
- **Categories**:
  - `FileHelpers.cs` - I/O operations (read/write, MemoryStream conversion)
  - `DateHelpers.cs` - Date formatting and manipulation
  - `StreamByteHelpers.cs` - Stream ↔ byte array conversions
  - `CsvHelpers.cs` - CSV parsing/writing
  - `ZipHelpers.cs` - ZIP archive operations
  - `Converters/` - Custom JSON converters
  - `Extensions/` - String, MIME type, collection extensions
- **Pattern**: Static `abstract` classes with no dependencies (lightweight)

### 4. **TheNerdCollective.Services** (Core Service Abstractions)
- **Azure Blob Integration**: `IAzureBlobService` abstraction
- **DI Extensions**: `AddNerdCollectiveServices()` extension method
- **Configuration**: `AzureBlobOptions` type-safe options pattern
- **Usage Pattern**: Register in `Program.cs`, inject `IServiceProvider` or specific service

### 5. **TheNerdCollective.Services.BlazorServer** (Blazor-Specific)
- **Circuit Management**: Custom `CircuitHandler` for Blazor Server apps
- **Graceful Shutdown**: Handles circuit expiry and reconnection
- **Endpoint Mapping**: Provides status endpoint middleware

### 6. **Integration Packages** (External API Clients)

#### **TheNerdCollective.Integrations.Harvest** (GetHarvest API v2)
- **Services**: `HarvestService` (main client)
- **Configuration**: `HarvestOptions` (ApiToken, AccountId, ProjectIds)
- **Pattern**: HttpClient via DI, options-based configuration
- **Setup**: `builder.Services.AddHarvestIntegration(config)`

#### **TheNerdCollective.Integrations.GitHub** (GitHub API v3)
- **Services**: `GitHubService` (workflows, runs, attempts)
- **Configuration**: `GitHubOptions` (Token, Owner, Repository)
- **Pattern**: HttpClient via DI, filter-based query methods
- **Methods**: List runs, cancel runs, rerun failed jobs, get attempts

#### **TheNerdCollective.Integrations.AzurePipelines** (Azure Pipelines API)
- **Services**: `AzurePipelinesService` (pipelines, runs, queuing)
- **Configuration**: `AzurePipelinesOptions` (Token, Organization, Project, ApiVersion)
- **Pattern**: HttpClient via DI, supports variable passing on queue

### 7. **Blazor UI Packages** (Client-Side Overlays)

#### **TheNerdCollective.Blazor.Reconnect** (Circuit Reconnection)
- **Role**: Professional UI for circuit disconnection/reconnection
- **Key File**: `wwwroot/js/blazor-reconnect.js`
- **Pattern**: MutationObserver detects Blazor's default modal, replaces with custom UI
- **Health Check**: 10-second timer verifies server health; auto-reloads if stuck
- **Non-Invasive**: Blazor starts normally—no `autostart="false"` needed

#### **TheNerdCollective.Blazor.VersionMonitor** (Update Detection)
- **Role**: Polls status endpoint, notifies on new version availability
- **Key File**: `wwwroot/js/blazor-version-monitor.js`
- **Pattern**: Polling timer (default 60s), network-aware (re-polls when online)
- **Status Endpoint**: JSON file at `/reconnection-status.json` with `version` field
- **Deployment Aware**: Optional deployment phase info (status, ETA)

#### **TheNerdCollective.Blazor.SessionMonitor** (Session Tracking)
- **Role**: Track active Blazor Server circuits/sessions for production monitoring
- **Key Service**: `SessionMonitorService` with `ISessionMonitorService` interface
- **Pattern**: CircuitHandler tracking session lifecycle, concurrent collections for thread-safety
- **Metrics**: Active sessions, peak sessions, total started/ended, average duration
- **API Endpoints**: 5 REST endpoints via `MapSessionMonitoringEndpoints()`
  - `/api/session-monitor/current` - Real-time metrics
  - `/api/session-monitor/history` - Historical snapshots (10k max)
  - `/api/session-monitor/active-circuits` - List of circuit IDs
  - `/api/session-monitor/deployment-windows` - Find optimal deploy times
  - `/api/session-monitor/can-deploy` - Check if safe to deploy
- **Use Cases**: Deployment automation, capacity planning, production monitoring
- **Setup**: `AddSessionMonitoring()` + `MapSessionMonitoringEndpoints()`

---

## Common Development Patterns

### Service Registration Pattern (DI)
```csharp
builder.Services.AddHarvestIntegration(builder.Configuration);
builder.Services.AddHttpClient<GitHubService>();
builder.Services.Configure<GitHubOptions>(builder.Configuration.GetSection("GitHub"));
```

### Configuration Pattern
```json
{
  "Harvest": {
    "ApiToken": "token_here",
    "AccountId": "account_id",
    "ProjectIds": [123, 456]
  }
}
```

### Razor Component Binding
```razor
<MudQuillEditor @bind-Value="HtmlContent" MinHeight="300px" />

@code {
    private string HtmlContent = "";
}
```

### Async Service Usage
```csharp
var blobService = serviceProvider.GetRequiredService<IAzureBlobService>();
await blobService.UploadAsync("container", "file.txt", stream);
```

---

## Key Files & References

| File | Purpose |
|------|---------|
| `TheNerdCollective.Components.sln` | Solution file, references all 11 projects |
| `NuGet.config` | **Critical**: Ensures v3 API endpoint for OIDC publishing |
| `.github/workflows/publish-packages.yml` | Automated NuGet publish workflow (OIDC-based) |
| `run-demo.sh` | Bash script to run demo app on multiple ports |
| `copilot-instructions.md` (root) | Extended NuGet publishing guide (legacy location) |
| `src/*/README.md` | Each package has detailed feature docs |
| `src/TheNerdCollective.Demo/Program.cs` | Demo app DI setup, circuit handler mapping |

---

## Important Conventions

1. **Nullable enabled** in all `.csproj` files (`<Nullable>enable</Nullable>`)
2. **Implicit usings** enabled (`<ImplicitUsings>enable</ImplicitUsings>`)
3. **.NET 10.0** target framework across all packages
4. **Apache License 2.0** in all package metadata
5. **Readme files in `.csproj`** (`<PackageReadmeFile>README.md</PackageReadmeFile>`)
6. **Version bumping** via `.csproj` `<Version>` tag (extracted by workflow)
7. **Namespace pattern**: `TheNerdCollective.{Domain}.{Component}` or `TheNerdCollective.{Category}.{Package}`

---

## Troubleshooting Common Issues

### NuGet Publishing Fails (403 Forbidden)
- **Cause**: v2 API being used instead of v3
- **Fix**: Verify `NuGet.config` exists at repo root with v3 endpoint
- **Verify**: Run `dotnet nuget list source` to confirm v3 is configured

### Demo App Won't Start
- **Cause**: Port conflict (5001 already in use)
- **Fix**: Check `run-demo.sh` for port binding; use `lsof -i :5001` to find blocking process
- **Note**: Do NOT kill processes yourself—notify the user

### Package Not Appearing on NuGet
- **Cause**: New package not added to workflow matrix
- **Fix**: Update `.github/workflows/publish-packages.yml` `PACKAGES` array
- **Verify**: Commit workflow change WITH package creation

### Wrong Package Version in NuGet
- **Cause**: Workflow extracted wrong version from `.csproj`
- **Fix**: Ensure only one `<Version>` tag in `.csproj` (not inherited from parent)

---

## Quick Reference: Package Purposes

| Package | Primary Use | When to Use |
|---------|------------|------------|
| Components | Blazor UI + MudQuillEditor | Building MudBlazor-based UIs with rich-text |
| MudSwiper | Carousel/slider component | Adding touch-enabled, responsive carousels to Blazor apps |
| Helpers | File, Date, CSV, Zip utilities | Common .NET operations without dependencies |
| Services | Azure Blob, DI extensions | Cloud storage + scalable service abstractions |
| Harvest | Timesheet API access | Integrating GetHarvest data into .NET apps |
| GitHub | Workflow automation | Managing GitHub Actions from .NET |
| AzurePipelines | Pipeline orchestration | Querying/running Azure DevOps pipelines |
| Reconnect | Circuit reconnection UI | Better UX for Blazor Server disconnects |
| VersionMonitor | Update notifications | Notifying users of deployed version changes |
| SessionMonitor | Session tracking & monitoring | Production monitoring, deployment automation, capacity planning |

---

## For More Details

Each package contains a comprehensive `README.md` in its folder:
- `src/TheNerdCollective.Helpers/README.md`
- `src/TheNerdCollective.Services/README.md`
- `src/TheNerdCollective.Integrations.GitHub/README.md`
- *etc.*

Reference these for API details, examples, and integration patterns specific to each package.
