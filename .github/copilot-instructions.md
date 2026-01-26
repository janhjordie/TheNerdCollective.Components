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
| Helpers | File, Date, CSV, Zip utilities | Common .NET operations without dependencies |
| Services | Azure Blob, DI extensions | Cloud storage + scalable service abstractions |
| Harvest | Timesheet API access | Integrating GetHarvest data into .NET apps |
| GitHub | Workflow automation | Managing GitHub Actions from .NET |
| AzurePipelines | Pipeline orchestration | Querying/running Azure DevOps pipelines |
| Reconnect | Circuit reconnection UI | Better UX for Blazor Server disconnects |
| VersionMonitor | Update notifications | Notifying users of deployed version changes |

---

## For More Details

Each package contains a comprehensive `README.md` in its folder:
- `src/TheNerdCollective.Helpers/README.md`
- `src/TheNerdCollective.Services/README.md`
- `src/TheNerdCollective.Integrations.GitHub/README.md`
- *etc.*

Reference these for API details, examples, and integration patterns specific to each package.
