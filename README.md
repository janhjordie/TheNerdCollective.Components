# The Nerd Collective - Components Library

A comprehensive collection of production-ready libraries and components for .NET 10+ applications, including Blazor components, utility helpers, service abstractions, and UI components built on MudBlazor.

## 📦 Packages

This monorepo includes six curated NuGet packages:

### [TheNerdCollective.Components](src/TheNerdCollective.Components/README.md)
The main Blazor components library bundling MudQuillEditor and other UI components.
- **Rich-text editor** (MudQuillEditor) powered by Quill 2.0
- Additional utility components for Blazor applications
- Seamless MudBlazor integration

### [TheNerdCollective.Helpers](src/TheNerdCollective.Helpers/README.md)
Lightweight utility library with essential helper methods for common operations.
- File I/O operations
- Date/time formatting and manipulation
- Stream and byte conversions
- CSV processing and handling
- String and MIME type extensions

### [TheNerdCollective.MudComponents](src/TheNerdCollective.MudComponents.MudQuillEditor/README.md)
Specialized package providing MudBlazor-compatible components.
- **MudQuillEditor** - Rich-text editor with dark/light theme support
- Configurable toolbar and customizable height
- Read-only mode and placeholder text support
- Two-way data binding with `@bind-Value`

### [TheNerdCollective.Services](src/TheNerdCollective.Services/README.md)
Foundational services library with abstractions and utilities for scalable applications.
- Azure Blob Storage service integration
- Dependency injection extensions
- Configuration options support
- Type-safe configuration patterns

### [TheNerdCollective.MudComponents.HarvestTimesheet](src/TheNerdCollective.MudComponents.HarvestTimesheet/README.md)
MudBlazor component for displaying and managing Harvest timesheets.
- Month navigation, summaries, and billable vs. unbilled tracking
- Depends on TheNerdCollective.Integrations.Harvest

### [TheNerdCollective.Integrations.Harvest](src/TheNerdCollective.Integrations.Harvest/README.md)
Integration client for GetHarvest API v2.
- Service abstractions and configuration support
- Used by the HarvestTimesheet UI

## 🚀 Quick Start

Each package has its own README with detailed setup instructions, examples, and API documentation. Start with the package that matches your needs:

- **Building Blazor UI?** → [TheNerdCollective.Components](src/TheNerdCollective.Components/README.md)
- **Need utility helpers?** → [TheNerdCollective.Helpers](src/TheNerdCollective.Helpers/README.md)
- **Using MudBlazor?** → [TheNerdCollective.MudComponents](src/TheNerdCollective.MudComponents.MudQuillEditor/README.md)
- **Setting up services?** → [TheNerdCollective.Services](src/TheNerdCollective.Services/README.md)

## 🎮 Try the Demo

A demo app is available showcasing the MudQuillEditor component with interactive examples:

```bash
cd src/TheNerdCollective.Demo
dotnet run
```

Visit `https://localhost:5001` to explore the MudQuillEditor features, test configurations, and see live previews.

## License

Licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) file for details.

Copyright © 2025 The Nerd Collective Aps

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, feature requests, or questions:
- 🐛 [GitHub Issues](https://github.com/janhjordie/MudQuillEditor/issues)
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


```
