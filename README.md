# The Nerd Collective - Components Library

> **📤 Quick Push**: `git add . && git commit -m "chore: nerd-components update" && git push origin main`

A comprehensive collection of production-ready libraries and components for .NET 10+ applications, including Blazor components, utility helpers, service abstractions, and UI components built on MudBlazor.

## 📦 Packages

This monorepo includes multiple curated NuGet packages:

### UI Components

#### [TheNerdCollective.Components](src/TheNerdCollective.Components/README.md)
The main Blazor components library bundling MudQuillEditor and other UI components.
- **Rich-text editor** (MudQuillEditor) powered by Quill 2.0
- Additional utility components for Blazor applications
- Seamless MudBlazor integration

#### [TheNerdCollective.MudComponents.MudQuillEditor](src/TheNerdCollective.MudComponents.MudQuillEditor/README.md)
Specialized package providing MudBlazor-compatible rich-text editor.
- **MudQuillEditor** - Rich-text editor with dark/light theme support
- Configurable toolbar and customizable height
- Read-only mode and placeholder text support
- Two-way data binding with `@bind-Value`

#### [TheNerdCollective.MudComponents.MudSwiper](src/TheNerdCollective.MudComponents.MudSwiper/README.md)
MudBlazor-compatible Blazor carousel/slider component powered by Swiper.js.
- Touch-enabled, responsive, and theme-aware
- Pagination, navigation, auto-play, and looping support
- Responsive breakpoints for mobile/tablet/desktop
- Full MudBlazor integration and JS interop

#### [TheNerdCollective.MudComponents.HarvestTimesheet](src/TheNerdCollective.MudComponents.HarvestTimesheet/README.md)
MudBlazor component for displaying and managing Harvest timesheets.
- Month navigation, summaries, and billable vs. unbilled tracking
- Depends on TheNerdCollective.Integrations.Harvest

#### [TheNerdCollective.MudComponents.SessionMonitor](src/TheNerdCollective.MudComponents.SessionMonitor/README.md)
MudBlazor components for monitoring Blazor Server sessions with real-time metrics and deployment planning.
- **Real-time dashboard** with live session counts, peak sessions, and average duration
- **Deployment window calculator** to find optimal zero/low-activity periods
- **Session history viewer** with trend indicators
- **Active circuit list** showing all connected sessions
- Auto-refresh every 5 seconds for live monitoring
- Seamless integration with TheNerdCollective.Blazor.SessionMonitor service

### Blazor Utilities

#### [TheNerdCollective.Blazor.Reconnect](src/TheNerdCollective.Blazor.Reconnect/README.md)
Professional reconnection UI for Blazor Server applications.
- Polished UX for circuit disconnection/reconnection
- Health check monitoring and automatic reload
- Non-invasive integration

#### [TheNerdCollective.Blazor.VersionMonitor](src/TheNerdCollective.Blazor.VersionMonitor/README.md)
Automatic version update detection for Blazor Server apps.
- Polls status endpoint for new deployments
- User-friendly update notifications
- Network-aware polling

#### [TheNerdCollective.Blazor.SessionMonitor](src/TheNerdCollective.Blazor.SessionMonitor/README.md)
Track and monitor active Blazor Server sessions/circuits for production monitoring.
- Real-time session count and historical metrics
- REST API endpoints for monitoring dashboards
- Find optimal deployment windows with zero active sessions
- Perfect for deployment automation and capacity planning

### Infrastructure & Services

#### [TheNerdCollective.Services](src/TheNerdCollective.Services/README.md)
Foundational services library with abstractions and utilities for scalable applications.
- Azure Blob Storage service integration
- Dependency injection extensions
- Configuration options support
- Type-safe configuration patterns

#### [TheNerdCollective.Helpers](src/TheNerdCollective.Helpers/README.md)
Lightweight utility library with essential helper methods for common operations.
- File I/O operations
- Date/time formatting and manipulation
- Stream and byte conversions
- CSV processing and handling
- String and MIME type extensions

### Integrations

#### [TheNerdCollective.Integrations.Harvest](src/TheNerdCollective.Integrations.Harvest/README.md)
Integration client for GetHarvest API v2.
- Service abstractions and configuration support
- Used by the HarvestTimesheet UI

#### [TheNerdCollective.Integrations.GitHub](src/TheNerdCollective.Integrations.GitHub/README.md)
GitHub API v3 integration for workflow management.
- List, cancel, and rerun workflow runs
- Filter by status, branch, event type
- Access workflow run attempts

#### [TheNerdCollective.Integrations.AzurePipelines](src/TheNerdCollective.Integrations.AzurePipelines/README.md)
Azure Pipelines API integration for pipeline orchestration.
- List, queue, and manage pipeline runs
- Pass variables to pipeline runs
- Query pipeline and run details

## 🚀 Quick Start

Each package has its own README with detailed setup instructions, examples, and API documentation. Start with the package that matches your needs:

- **Building Blazor UI?** → [TheNerdCollective.Components](src/TheNerdCollective.Components/README.md)
- **Need a carousel/slider?** → [MudSwiper](src/TheNerdCollective.MudComponents.MudSwiper/README.md)
- **Need utility helpers?** → [TheNerdCollective.Helpers](src/TheNerdCollective.Helpers/README.md)
- **Using MudBlazor?** → [TheNerdCollective.MudComponents.MudQuillEditor](src/TheNerdCollective.MudComponents.MudQuillEditor/README.md)
- **Setting up services?** → [TheNerdCollective.Services](src/TheNerdCollective.Services/README.md)
- **Monitoring Blazor Server sessions?** → [SessionMonitor Service](src/TheNerdCollective.Blazor.SessionMonitor/README.md) (API) or [SessionMonitor Components](src/TheNerdCollective.MudComponents.SessionMonitor/README.md) (UI)
- **Better reconnection UX?** → [Blazor.Reconnect](src/TheNerdCollective.Blazor.Reconnect/README.md)
- **Version update notifications?** → [Blazor.VersionMonitor](src/TheNerdCollective.Blazor.VersionMonitor/README.md)

## 🔗 Integration Guide

Use nerd-components as a git submodule in your projects for easy updates and maintenance.

### Setup (One-time in your project)

```bash
git submodule add https://github.com/janhjordie/nerd-components.git 00-nerd-components
```

This clones the nerd-components into a `00-nerd-components` folder at your project root.

### Using Components in Your Project

Reference the packages from the submodule in your `.csproj` files:

```xml
<ItemGroup>
  <ProjectReference Include="../../00-nerd-components/src/TheNerdCollective.Helpers/TheNerdCollective.Helpers.csproj" />
  <ProjectReference Include="../../00-nerd-components/src/TheNerdCollective.Services/TheNerdCollective.Services.csproj" />
  <!-- Add other packages as needed -->
</ItemGroup>
```

### Keep Components Updated

```bash
git submodule update --remote
```

### Contributing Back

Improved helpers, services, or components? Make them publicly available:

1. **Create** the feature locally in your project
2. **Move** it to the appropriate package folder in nerd-components (or create a new public package)
3. **Update** its namespace to `TheNerdCollective.*`
4. **Push** to [nerd-components repo](https://github.com/janhjordie/nerd-components)
5. **Publish** to [NuGet.org](https://nuget.org) via GitHub Actions

Over time, nerd-components becomes a richer, reusable foundation across all your projects.

## 🎮 Try the Demo

A demo app is available showcasing the MudQuillEditor and MudSwiper components with interactive examples:

```bash
cd src/TheNerdCollective.Demo
dotnet run
```

Visit `https://localhost:5001` (or the port shown in your terminal) to explore the MudQuillEditor and MudSwiper features, test configurations, and see live previews of both components.

## License

Licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) file for details.

Copyright © 2025 The Nerd Collective Aps

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, feature requests, or questions:
- 🐛 [GitHub Issues](https://github.com/janhjordie/nerd-components/issues)
- 💬 GitHub Discussions
- 📧 Contact: [The Nerd Collective](https://www.thenerdcollective.dk/)

## Built by

[The Nerd Collective Aps](https://www.thenerdcollective.dk/)

Developed by [Jan Hjørdie](https://github.com/janhjordie/)

---

**MudQuillEditor** is a production-ready component we use for our customers' applications. It combines the power of Quill 2.0 with MudBlazor's beautiful design system.

## Documentation

For detailed documentation and interactive demos, visit the [online demo application](https://thenerdcollective-components.vercel.app/).

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)

By [Jan Hjørdie](https://github.com/janhjordie/) - [LinkedIn](https://www.linkedin.com/in/janhjordie/) | [Dev.to](https://dev.to/janhjordie)
