# The Nerd Collective - Components Library

A comprehensive collection of production-ready Blazor components for .NET 10+ applications. This library includes both generic .NET components and MudBlazor-specific components.

## Component Categories

### MudComponents
UI components built specifically for [MudBlazor 8.15+](https://mudblazor.com/), providing seamless integration with MudBlazor's design system.

- **MudQuillEditor** - A rich-text editor component powered by [Quill 2.0](https://quilljs.com/)

### Components
Generic .NET utilities and helper components for building robust Blazor applications.

*More utilities coming soon.*

## MudQuillEditor Features

- **Two-way Data Binding** - Use `@bind-Value` for seamless data synchronization
- **Automatic Dark/Light Theme Support** - Adapts to MudBlazor theme changes
- **Customizable Height** - Configure MinHeight and MaxHeight
- **Configurable Toolbar** - Enable/disable formatting features dynamically
- **Placeholder Text** - Guide users with custom placeholder messages
- **Read-Only Mode** - Display content without editing capabilities
- **Auto-loads Quill from CDN** - No bundling needed, handles dependencies automatically
- **Full Async/Await Support** - Modern async APIs throughout
- **Interactive Playground** - Live demo with configuration testing

## Installation

### NuGet Packages

Install the main component library:

```bash
dotnet add package TheNerdCollective.Components
```

Or install individual components:

#### MudComponents

```bash
dotnet add package TheNerdCollective.MudComponents.MudQuillEditor
```

### MudQuillEditor Setup

### MudQuillEditor Setup

#### Step 1: Add Script Reference

In your `App.razor`, add the MudQuillEditor script reference **before** the Blazor runtime script:

```html
<head>
    <!-- Other head content -->
    <script src="_content/TheNerdCollective.MudComponents.MudQuillEditor/js/mudquilleditor.js"></script>
</head>
<body>
    <!-- Routes and Components -->
    <script src="_framework/blazor.server.js"></script>
</body>
```

**Requirements:**
- MudBlazor must be installed and configured
- MudQuillEditor automatically loads Quill CSS/JS from jsDelivr CDN
- No additional setup needed

#### Step 2: Import the Component

Add to your `_Imports.razor`:

```csharp
@using TheNerdCollective.MudComponents.MudQuillEditor
```

## Usage - MudQuillEditor

### Basic Example

```razor
<MudQuillEditor @bind-Value="HtmlContent" 
                MinHeight="300px" 
                MaxHeight="300px"
                Placeholder="Enter your content here..." />

@code {
    private string HtmlContent { get; set; } = "<p>Hello from MudQuillEditor</p>";
}
```

### Advanced Configuration

```razor
<MudQuillEditor @bind-Value="Content"
                ReadOnly="@IsReadOnly"
                Placeholder="@EditorPlaceholder"
                MinHeight="200px"
                MaxHeight="500px"
                Toolbar="@GetToolbar()" />

@code {
    private string Content = "";
    private bool IsReadOnly = false;
    private string EditorPlaceholder = "Type something...";
    
    private object? GetToolbar()
    {
        return new object[]
        {
            new[] { "bold", "italic", "underline" },
            new[] { new { list = "ordered" }, new { list = "bullet" } },
            new[] { "link", "image" }
        };
    }
}
```

## Component Parameters - MudQuillEditor

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Value` | `string?` | null | HTML content of the editor |
| `ValueChanged` | `EventCallback<string?>` | — | Fires when editor content changes (two-way binding) |
| `MinHeight` | `string?` | null | Minimum editor height (CSS value, e.g., "150px") |
| `MaxHeight` | `string` | "150px" | Maximum editor height (CSS value, e.g., "300px") |
| `Theme` | `string` | "snow" | Quill theme name ("snow" or "bubble") |
| `ReadOnly` | `bool` | false | Disable editing when true |
| `Toolbar` | `object?` | Default | Customizable toolbar modules (bold, italic, underline, lists, link, image) |
| `Placeholder` | `string?` | null | Placeholder text shown when editor is empty |

## Component Methods - MudQuillEditor

| Method | Returns | Description |
|--------|---------|-------------|
| `SetHtmlAsync(string? html)` | `Task` | Set editor content programmatically |
| `GetHtmlAsync()` | `Task<string?>` | Get editor content programmatically |

## Demo Application

A fully-featured demo app is included with:
- **Interactive Playground** - Test features with live preview
- **Theme Switching** - See dark/light mode support
- **Configuration Testing** - Experiment with different settings
- **Installation Guide** - Complete setup instructions

Run the demo:

```bash
cd src/TheNerdCollective.Demo
dotnet run
```

Then visit `https://localhost:5001` in your browser.

## Toolbar Configuration - MudQuillEditor

The toolbar can be customized by passing an array of modules:

```csharp
// Minimal toolbar
var toolbar = new object[]
{
    new[] { "bold", "italic" }
};

// Full toolbar
var toolbar = new object[]
{
    new[] { "bold", "italic", "underline" },
    new[] { new { list = "ordered" }, new { list = "bullet" } },
    new[] { "link", "image" },
    new[] { "blockquote", "code-block" }
};
```

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

Developed by [janhjordie](https://github.com/janhjordie)

---

**MudQuillEditor** is a production-ready component we use for our customers' applications. It combines the power of Quill 2.0 with MudBlazor's beautiful design system.

## Documentation

For detailed documentation and interactive demos, visit the [online demo application](https://thenerdcollective-components.vercel.app/).

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)


```
