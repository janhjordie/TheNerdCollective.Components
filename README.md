# MudBlazor HtmlEditor
```markdown
# MudBlazor HtmlEditor

## Project Goal

Build an open-source HTML editor component for MudBlazor 8.15 and .NET 10, inspired by erinmclaughlin/MudBlazor.HtmlEditor.

Scope:
- Provide a MudBlazor-compatible Blazor component that wraps the Quill rich-text editor (MIT-licensed).
- Support basic formatting, links, images, and a plugin-friendly configuration surface.
- Ship as a NuGet package targeting .NET 10 and integrate cleanly with MudBlazor 8.15 layouts and forms.

Deliverables:
- Blazor component library project
- Demo app showing usage in MudBlazor pages
- README, API usage examples, and CONTRIBUTING guide
- Unit/integration tests and GitHub Actions for build/test
- GitHub Actions workflow to pack and publish NuGet packages (requires `NUGET_API_KEY` secret)

Why Quill
- Quill is MIT-licensed, lightweight, easy to integrate, and has a mature ecosystem — a fast path to a stable editor wrapper.

Getting started (dev):
1. Clone the repo
2. Open the solution and create the Blazor project/component under `src/`
3. Add `quill` (via CDN or npm/bundled JS) and implement JS interop

CI / NuGet publishing (notes):
- The repository contains a GitHub Actions workflow template `.github/workflows/publish-nuget.yml` that will build, pack, and push NuGet packages when a tag like `v1.0.0` is pushed.
- Configure repository secret `NUGET_API_KEY` with your NuGet.org API key.

License: MIT (recommended)

Usage example
-------------
Add the namespace to your `_Imports.razor` or the page:

```razor
@using TheNerdCollective.MudQuillEditor
```

Then use the component with two-way binding:

```razor
<MudQuillEditor @bind-Value="HtmlContent" />

@code {
	private string HtmlContent { get; set; } = "<p>Hello</p>";
}
```

Demo app:
- A minimal Blazor Server demo app is scaffolded under `src/TheNerdCollective.MudQuillEditor.Demo/`.

```
