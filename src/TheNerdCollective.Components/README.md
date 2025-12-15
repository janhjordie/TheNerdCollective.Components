# TheNerdCollective.Components

A comprehensive Blazor components library providing production-ready UI and utility components for MudBlazor-based applications.

## Overview

This package serves as the main entry point to The Nerd Collective component ecosystem, bundling together:
- **MudQuillEditor** - A powerful rich-text editor for MudBlazor applications
- Additional utility components and extensions

## Quick Start

### Installation

```bash
dotnet add package TheNerdCollective.Components
```

### Setup

1. **Add Script Reference** in `App.razor`:
```html
<head>
    <script src="_content/TheNerdCollective.MudComponents.MudQuillEditor/js/mudquilleditor.js"></script>
</head>
```

2. **Import in `_Imports.razor`**:
```csharp
@using TheNerdCollective.MudComponents.MudQuillEditor
```

3. **Use in your components**:
```razor
<MudQuillEditor @bind-Value="Content" 
                MinHeight="300px" 
                Placeholder="Enter your content..." />

@code {
    private string Content = "";
}
```

## What's Included

- **MudQuillEditor** - Rich-text editor with Quill 2.0 integration
- Additional utility components for Blazor applications

## Dependencies

- **MudBlazor** 8.15+
- **.NET** 10.0+

## Documentation

For comprehensive documentation on individual components, see:
- [MudQuillEditor Documentation](https://github.com/janhjordie/TheNerdCollective.Components#mudquilleditor-features)

## License

Apache License 2.0 - See LICENSE file for details

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)
