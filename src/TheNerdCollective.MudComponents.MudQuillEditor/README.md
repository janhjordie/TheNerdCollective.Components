# TheNerdCollective.MudComponents

A specialized package providing MudBlazor-compatible Blazor components. This package contains the MudQuillEditor component, a powerful rich-text editor wrapper around Quill 2.0.

## Overview

TheNerdCollective.MudComponents extends MudBlazor with additional specialized components designed to seamlessly integrate with MudBlazor's design system and theming.

## Quick Start

### Installation

```bash
dotnet add package TheNerdCollective.MudComponents
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

### Basic Usage

```razor
<MudQuillEditor @bind-Value="HtmlContent" 
                MinHeight="300px" 
                MaxHeight="300px"
                Placeholder="Enter your content here..." />

@code {
    private string HtmlContent = "<p>Hello from MudQuillEditor</p>";
}
```

## MudQuillEditor Features

- **Two-way Data Binding** - Use `@bind-Value` for seamless data synchronization
- **Automatic Dark/Light Theme Support** - Adapts to MudBlazor theme changes
- **Customizable Height** - Configure MinHeight and MaxHeight
- **Configurable Toolbar** - Enable/disable formatting features dynamically
- **Placeholder Text** - Guide users with custom placeholder messages
- **Read-Only Mode** - Display content without editing capabilities
- **Auto-loads Quill from CDN** - No bundling needed, handles dependencies automatically
- **Full Async/Await Support** - Modern async APIs throughout

## Advanced Configuration

```razor
<MudQuillEditor @bind-Value="Content"
                ReadOnly="@IsReadOnly"
                Placeholder="@EditorPlaceholder"
                MinHeight="200px"
                MaxHeight="500px"
                Theme="bubble" />

@code {
    private string Content = "";
    private bool IsReadOnly = false;
    private string EditorPlaceholder = "Start typing...";
}
```

## Theme Support

MudQuillEditor supports two Quill themes via the `Theme` parameter. The default is **"snow"**.

### Snow Theme (Default)
The classic editor theme with a toolbar at the top. Perfect for document-like editing experiences where users expect a traditional editor interface.

```razor
<MudQuillEditor @bind-Value="Content" Theme="snow" />
```

**Configuration:**
```csharp
const quill = new Quill('#editor', {
  placeholder: 'Compose an epic...',
  theme: 'snow',
});
```

### Bubble Theme
A minimal, floating toolbar that appears when you select text. Great for content that should blend seamlessly with your UI and for inline editing experiences.

```razor
<MudQuillEditor @bind-Value="Content" Theme="bubble" />
```

**Configuration:**
```csharp
const quill = new Quill('#editor', {
  theme: 'bubble',
});
```

### Complete Theme Example

```razor
<MudQuillEditor @bind-Value="HtmlContent" 
                Theme="@CurrentTheme"
                MinHeight="300px" 
                MaxHeight="500px"
                Placeholder="Enter your content here..." />

@code {
    private string HtmlContent = "";
    private string CurrentTheme = "snow"; // or "bubble"
}
```

## Toolbar Customization

Control which formatting tools are available:

```razor
<MudQuillEditor @bind-Value="Content"
                Toolbar="@GetToolbar()" />

@code {
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

## Format Support

By default, MudQuillEditor allows all Quill formats. You can restrict which formats are allowed in the editor using optional parameters. This is independent from the toolbar configuration and controls what content can be pasted or programmatically inserted.

### Inline Formats

Control individual inline formatting options:

```razor
<MudQuillEditor @bind-Value="Content"
                EnableBold="true"
                EnableItalic="true"
                EnableUnderline="true"
                EnableCode="true"
                EnableLink="true" />
```

**Available inline format parameters:**
- `EnableBold` - Bold text formatting
- `EnableItalic` - Italic text formatting
- `EnableUnderline` - Underlined text
- `EnableStrike` - Strikethrough text
- `EnableCode` - Inline code formatting
- `EnableColor` - Text color
- `EnableBackground` - Text background color
- `EnableFont` - Font family selection
- `EnableSize` - Font size
- `EnableScript` - Superscript and subscript

### Block Formats

Control block-level formatting:

```razor
<MudQuillEditor @bind-Value="Content"
                EnableHeader="true"
                EnableBlockquote="true"
                EnableList="true"
                EnableCodeBlock="true" />
```

**Available block format parameters:**
- `EnableHeader` - Header/heading levels
- `EnableBlockquote` - Blockquote formatting
- `EnableList` - Bullet and numbered lists
- `EnableIndent` - Indentation
- `EnableAlign` - Text alignment (left, center, right, justify)
- `EnableDirection` - Text direction (LTR, RTL)
- `EnableCodeBlock` - Code blocks with syntax highlighting

### Embed Formats

Control embeddable content:

```razor
<MudQuillEditor @bind-Value="Content"
                EnableImage="true" />
```

**Available embed format parameters:**
- `EnableImage` - Image embeds

### Format Groups

Enable entire format categories at once:

```razor
<!-- Enable all inline formats -->
<MudQuillEditor @bind-Value="Content" EnableAllInlineFormats="true" />

<!-- Enable all block formats -->
<MudQuillEditor @bind-Value="Content" EnableAllBlockFormats="true" />

<!-- Enable all embed formats -->
<MudQuillEditor @bind-Value="Content" EnableAllEmbedFormats="true" />

<!-- Enable all formats (default behavior) -->
<MudQuillEditor @bind-Value="Content" EnableAllFormats="true" />
```

### Complex Format Example

```razor
<MudQuillEditor @bind-Value="Content"
                EnableBold="true"
                EnableItalic="true"
                EnableUnderline="true"
                EnableAllBlockFormats="true"
                EnableImage="true"
                MinHeight="300px"
                MaxHeight="500px" />
```

## Dependencies

- **MudBlazor** 8.15+
- **Quill** 2.0 (loaded from CDN)
- **.NET** 10.0+

## License

Apache License 2.0 - See LICENSE file for details

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)
