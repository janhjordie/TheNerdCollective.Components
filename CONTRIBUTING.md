# Contributing to TheNerdCollective.Components

Welcome! This is a .NET 10+ monorepo containing 15 independent NuGet packages. This guide will help you get started with development, adding new packages, and understanding the project structure.

---

## 🚀 Getting Started

### Prerequisites

- .NET 10.0 or later
- Git
- Visual Studio 2022 or VS Code
- (Optional) Docker for emulation/testing

### Running the Demo Application

The demo app showcases all components in a Blazor Server application:

```bash
# Navigate to demo project
cd src/TheNerdCollective.Demo

# Run the application
dotnet run

# Application starts at https://localhost:5001
```

**Or use the provided script:**

```bash
./run-demo.sh
```

This runs the demo on multiple ports for testing.

### Building the Solution

```bash
# Restore, build, and pack all projects
dotnet build

# Run tests (when test projects are added)
dotnet test

# Pack all NuGet packages
dotnet pack
```

---

## 📦 Project Structure

```
TheNerdCollective.Components/
├── src/                          # 15 NuGet packages
│   ├── TheNerdCollective.Components/              # Main umbrella package
│   ├── TheNerdCollective.MudComponents.*/         # UI components (3 packages)
│   ├── TheNerdCollective.Blazor.*/                # Blazor utilities (3 packages)
│   ├── TheNerdCollective.Integrations.*/          # API integrations (3 packages)
│   ├── TheNerdCollective.Services/                # Service abstractions
│   ├── TheNerdCollective.Services.BlazorServer/   # Blazor-specific services
│   ├── TheNerdCollective.Helpers/                 # Utility helpers
│   └── TheNerdCollective.Demo/                    # Demo application
├── tests/                        # Test projects (to be created)
├── docs/
│   ├── 00-nerd-rules-submodule/  # Development standards
│   └── 00-nerd-rules-recommendations/ # Analysis reports
├── .github/
│   └── workflows/                # GitHub Actions CI/CD
├── NuGet.config                  # NuGet v3 API configuration
├── copilot-instructions.md       # AI development guidelines
└── nerd-components.code-workspace
```

---

## 📝 Adding a New Package

### Step 1: Create Project Structure

```bash
# Create new package directory
mkdir -p src/TheNerdCollective.{Category}.{PackageName}

# Create C# project file
dotnet new classlib -n TheNerdCollective.{Category}.{PackageName} -f net10.0 --force
```

### Step 2: Configure Package Metadata

Edit `src/TheNerdCollective.{Category}.{PackageName}/{PackageName}.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    
    <!-- NuGet Metadata -->
    <Version>1.0.0</Version>
    <Title>THE NERD COLLECTIVE Package Title</Title>
    <Description>Brief description of package functionality.</Description>
    <Authors>@janhjordie</Authors>
    <License>Apache-2.0</License>
    <PackageProjectUrl>https://github.com/janhjordie/nerd-rules</PackageProjectUrl>
    <RepositoryUrl>https://github.com/janhjordie/TheNerdCollective.Components</RepositoryUrl>
    <RepositoryType>git</RepositoryType>
    <PackageTags>blazor;components;mud</PackageTags>
    <PackageReadmeFile>README.md</PackageReadmeFile>
  </PropertyGroup>

  <ItemGroup>
    <None Include="README.md" Pack="true" PackagePath="\"/>
  </ItemGroup>

</Project>
```

### Step 3: Create README.md

Create `src/TheNerdCollective.{Category}.{PackageName}/README.md` with:

- Package description and use case
- Installation instructions
- Feature list
- Usage examples with code samples
- API reference (method signatures)
- Configuration examples (if applicable)
- Dependencies

See [src/TheNerdCollective.Components/README.md](src/TheNerdCollective.Components/README.md) for reference.

### Step 4: Update Publishing Workflow

**CRITICAL**: Update `.github/workflows/publish-packages.yml`

Find the `declare -A PACKAGES=(` section and add:

```bash
["PackageName"]="src/TheNerdCollective.Category.PackageName"
```

Without this step, the package will **NOT be automatically published to NuGet**!

### Step 5: Add to Solution

```bash
dotnet sln add src/TheNerdCollective.{Category}.{PackageName}/TheNerdCollective.{Category}.{PackageName}.csproj
```

### Step 6: Commit and Push

```bash
git add .
git commit -m "feat: add TheNerdCollective.Category.PackageName package"
git push origin main
```

---

## 🔄 Git Workflow

### Branching Strategy

```
main (production)
 ├── feature/add-awesome-feature
 ├── fix/resolve-critical-bug
 └── docs/improve-documentation
```

### Commit Message Format

Follow conventional commits:

```bash
# Features
git commit -m "feat: add new component MudAwesomeEditor"

# Fixes
git commit -m "fix: resolve null reference in GitHubService"

# Documentation
git commit -m "docs: improve API documentation"

# Chores (version bumps, deps)
git commit -m "chore: bump Services to v2.1.0"

# Tests
git commit -m "test: add GitHub API retry tests"
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes following code standards
3. Run `dotnet build` and ensure no warnings
4. Commit with conventional messages
5. Push to GitHub
6. Create PR with clear description
7. Await code review
8. Merge to `main` after approval

---

## 📦 Releasing New Package Versions

### Automatic Publishing (Recommended)

**To release a new version:**

1. **Bump the version** in the package's `.csproj` file:
   ```xml
   <Version>1.2.3</Version>
   ```

2. **Commit with semantic versioning message:**
   ```bash
   git commit -m "chore: bump Components to v1.2.3 - add MudAwesome component"
   ```

3. **Push to main:**
   ```bash
   git push origin main
   ```

4. ✅ **Done!** GitHub Actions automatically:
   - Builds the package
   - Publishes to NuGet using OIDC trusted publishing
   - Creates git tag (e.g., `components-v1.2.3`)

### Version Numbering

Follow **Semantic Versioning**:

- **MAJOR** (1.0.0) - Breaking changes
- **MINOR** (1.1.0) - New features (backwards compatible)
- **PATCH** (1.1.1) - Bug fixes only

Examples:
- `1.0.0` → `2.0.0` - Major breaking change
- `1.0.0` → `1.1.0` - New component added
- `1.0.0` → `1.0.1` - Bug fix

---

## ✅ Code Review Checklist

Before submitting a PR, ensure your code passes these checks:

### Code Quality
- [ ] No `TODO`, `FIXME`, or `HACK` comments left in code
- [ ] All public methods have XML documentation (`/// <summary>`)
- [ ] No bare `catch` blocks without exception handling
- [ ] Proper null-safety with `#nullable enable`
- [ ] No hardcoded secrets or API keys

### Architecture
- [ ] Follows dependency injection patterns
- [ ] No `new` instantiation of services (use DI)
- [ ] Proper separation of concerns
- [ ] Reuses existing patterns (don't reinvent)

### Testing
- [ ] Critical paths have unit tests
- [ ] Integration tests for external API calls
- [ ] Happy path and error scenarios covered

### Documentation
- [ ] README updated with new features
- [ ] API methods documented with examples
- [ ] Configuration options documented
- [ ] Breaking changes noted

### Git Hygiene
- [ ] Commit messages follow conventional commits
- [ ] One logical change per commit
- [ ] No merge commits (rebase if needed)
- [ ] Branch is up-to-date with `main`

### Standards Compliance
- [ ] Follows nerd rules standards (see [copilot-instructions.md](copilot-instructions.md))
- [ ] No hardcoded values (use constants, config)
- [ ] Error handling is consistent with project patterns
- [ ] Logging is structured and informative

---

## 🏗️ Development Standards

This project follows **Nerd Rules** - a comprehensive set of development standards stored in `docs/00-nerd-rules-submodule/`.

### Key Rules

**Rule 5: Search First** 🔍
- ALWAYS check if code/pattern already exists before creating new
- Reuse existing helpers and utilities
- Ask yourself: "Has this been solved before?"

**Rule 6: DRY Principle** 🚫
- Don't Repeat Yourself
- Extract common patterns into shared code
- One source of truth for each concept

**Rule 7: KISS Principle** ✨
- Keep It Simple, Stupid
- Choose simplicity over cleverness
- Code should be easy to understand and maintain

### Recommended Standards

Review these documents when adding features:

- **Testing**: [`01-project-rules/06-testing-standards.md`](docs/00-nerd-rules-submodule/01-project-rules/06-testing-standards.md)
- **Error Handling**: [`01-project-rules/09-error-handling-logging.md`](docs/00-nerd-rules-submodule/01-project-rules/09-error-handling-logging.md)
- **Security**: [`01-project-rules/11-security-standards.md`](docs/00-nerd-rules-submodule/01-project-rules/11-security-standards.md)
- **API Design**: [`01-project-rules/08-api-design-standards.md`](docs/00-nerd-rules-submodule/01-project-rules/08-api-design-standards.md)
- **Architecture**: [`01-project-rules/05-architectural-patterns.md`](docs/00-nerd-rules-submodule/01-project-rules/05-architectural-patterns.md)

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
dotnet test

# Run tests in specific project
dotnet test tests/TheNerdCollective.Helpers.Tests

# Run with verbose output
dotnet test --logger "console;verbosity=detailed"

# Run specific test class
dotnet test --filter "ClassName"
```

### Writing Tests

Use **xUnit** for new test projects. Example structure:

```csharp
using Xunit;
using TheNerdCollective.Helpers;

public class FileHelpersTests
{
    [Fact]
    public void ReadFile_WithValidPath_ReturnsContent()
    {
        // Arrange
        string testFile = "test.txt";
        string expected = "test content";
        
        // Act
        var result = FileHelpers.Read(testFile);
        
        // Assert
        Assert.Equal(expected, result);
    }
}
```

---

## 🐛 Reporting Issues

Found a bug or have a feature request? 

1. Check existing issues first (search for keywords)
2. Create new issue with:
   - Clear title describing the problem
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment (OS, .NET version, package version)
3. Label appropriately (bug, enhancement, documentation)

---

## 📚 Useful Resources

- **Nerd Rules Master**: [`docs/00-nerd-rules-submodule/00-nerd-rules.md`](docs/00-nerd-rules-submodule/00-nerd-rules.md)
- **Analysis Reports**: [`docs/00-nerd-rules-recommendations/`](docs/00-nerd-rules-recommendations/)
- **Project README**: [README.md](README.md)
- **.NET 10 Docs**: https://learn.microsoft.com/en-us/dotnet/
- **Blazor Docs**: https://learn.microsoft.com/en-us/aspnet/core/blazor/
- **MudBlazor Docs**: https://mudblazor.com/
- **NuGet Publishing**: https://learn.microsoft.com/en-us/nuget/nuget-org/publish-a-package

---

## 💡 Tips for Success

1. **Always follow nerd rules** - Read the standards before starting work
2. **Keep packages focused** - One responsibility per package
3. **Document as you code** - Don't leave it for later
4. **Use semantic versioning** - Helps users understand breaking changes
5. **Test critically** - Focus on edge cases and error scenarios
6. **Code review seriously** - It's your chance to learn and teach
7. **Keep it simple** - Complex code is harder to maintain

---

## ❓ Questions?

- Check the **Nerd Rules** documentation in `docs/00-nerd-rules-submodule/`
- Review existing packages in `src/` for patterns
- Open an issue for questions about project guidelines
- Check previous PR reviews for context

---

Happy Contributing! 🎉

**Last Updated**: 2026-02-16  
**Maintainer**: @janhjordie
