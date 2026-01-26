# TheNerdCollective.MudComponents.MudSwiper

A MudBlazor-compatible Blazor component wrapper for [Swiper](https://swiperjs.com/) - a powerful, modern touch slider library.

## Overview

MudSwiper provides a seamless integration of Swiper.js with Blazor and MudBlazor, enabling you to create beautiful, responsive carousels and sliders with minimal configuration.

**Key Features:**
- ✅ **Touch-Enabled Carousel** - Works great on mobile and desktop
- ✅ **Slides Per View** - Display multiple slides at once with responsive breakpoints
- ✅ **Lazy Loading Support** - Built-in lazy loading for images and content
- ✅ **Auto-Play** - Automatic slide advancement with customizable delays
- ✅ **Navigation & Pagination** - Click to navigate or use keyboard/mouse wheel
- ✅ **MudBlazor Theming** - Integrates seamlessly with MudBlazor's design system
- ✅ **CDN-Based** - No npm/node_modules required, loaded from CDN
- ✅ **Event Callbacks** - React to slide changes and carousel events

## Quick Start

### Installation

```bash
dotnet add package TheNerdCollective.MudComponents.MudSwiper
```

### Setup

1. **Add Script Reference** in `App.razor` (inside `<body>` tag):
```html
<body>
    <Routes @rendermode="InteractiveServer" />
    
    <!-- Swiper CSS & JS are auto-loaded on first use -->
    <script src="_framework/blazor.web.js"></script>
    
    <!-- MudSwiper initialization -->
    <script src="_content/TheNerdCollective.MudComponents.MudSwiper/js/mudswiper.js" type="module"></script>
</body>
```

2. **Import in `_Imports.razor`**:
```csharp
@using TheNerdCollective.MudComponents.MudSwiper
```

3. **Use in your components**:
```razor
<MudSwiper Slides="@items" SlidesPerView="3" SpaceBetween="15" />
```

## Usage Examples

### Basic Carousel with Text Slides

```razor
<MudSwiper Slides="@slides" Height="300px" />

@code {
    private List<string> slides = new()
    {
        "Slide 1",
        "Slide 2",
        "Slide 3",
        "Slide 4",
        "Slide 5"
    };
}
```

### Multiple Slides Per View (Slides Per View Demo)

```razor
<MudSwiper Slides="@items" 
           SlidesPerView="3"
           SpaceBetween="30"
           ShowPagination="true"
           Height="250px">
    <SlideTemplate Context="item">
        <div style="background: #444; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            <strong>@item</strong>
        </div>
    </SlideTemplate>
</MudSwiper>

@code {
    private List<string> items = Enumerable.Range(1, 9).Select(x => $"Slide {x}").ToList();
}
```

### Image Carousel with Navigation

```razor
<MudSwiper Slides="@images"
           ShowPagination="true"
           ShowNavigation="true"
           Height="400px">
    <SlideTemplate Context="image">
        <img src="@image" style="width: 100%; height: 100%; object-fit: cover;" alt="Carousel image" />
    </SlideTemplate>
</MudSwiper>

@code {
    private List<string> images = new()
    {
        "https://via.placeholder.com/600x400?text=Image+1",
        "https://via.placeholder.com/600x400?text=Image+2",
        "https://via.placeholder.com/600x400?text=Image+3"
    };
}
```

### Auto-Rotating Carousel with Events

```razor
<div>
    <p>Current Slide: <strong>@currentSlide</strong></p>
    <MudSwiper @ref="swiperComponent"
               Slides="@products"
               SlidesPerView="1"
               AutoplayDelay="5000"
               AutoplayPauseOnHover="true"
               OnSlideChange="HandleSlideChange"
               OnReachEnd="HandleReachEnd"
               Height="300px">
        <SlideTemplate Context="product">
            <MudCard style="width: 100%; height: 100%;">
                <MudCardContent>
                    <MudText Typo="Typo.h6">@product.Name</MudText>
                    <MudText>@product.Description</MudText>
                </MudCardContent>
            </MudCard>
        </SlideTemplate>
    </MudSwiper>
</div>

@code {
    private MudSwiper? swiperComponent;
    private int currentSlide = 0;

    private List<Product> products = new()
    {
        new() { Name = "Product 1", Description = "Description 1" },
        new() { Name = "Product 2", Description = "Description 2" },
        new() { Name = "Product 3", Description = "Description 3" }
    };

    private Task HandleSlideChange(int index)
    {
        currentSlide = index;
        return Task.CompletedTask;
    }

    private Task HandleReachEnd()
    {
        Console.WriteLine("Carousel reached the end!");
        return Task.CompletedTask;
    }

    private class Product
    {
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
    }
}
```

### Programmatic Control

```razor
<MudStack>
    <MudButton Variant="Variant.Filled" Color="Color.Primary" OnClick="GoToPrevious">Previous</MudButton>
    <MudButton Variant="Variant.Filled" Color="Color.Primary" OnClick="GoToNext">Next</MudButton>
    <MudButton Variant="Variant.Filled" Color="Color.Secondary" OnClick="GoToSlide">Go to Slide 3</MudButton>
</MudStack>

<MudSwiper @ref="swiperComponent" Slides="@items" Height="250px" />

@code {
    private MudSwiper? swiperComponent;
    private List<string> items = Enumerable.Range(1, 6).Select(x => $"Slide {x}").ToList();

    private async Task GoToNext()
    {
        if (swiperComponent != null)
            await swiperComponent.NextSlideAsync();
    }

    private async Task GoToPrevious()
    {
        if (swiperComponent != null)
            await swiperComponent.PreviousSlideAsync();
    }

    private async Task GoToSlide()
    {
        if (swiperComponent != null)
            await swiperComponent.GoToSlideAsync(2); // Go to slide 3 (0-indexed)
    }
}
```

## API Reference

### Component Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Slides` | `IEnumerable<object>` | `null` | Collection of slides to display |
| `SlideTemplate` | `RenderFragment<object>` | `null` | Custom template for rendering each slide |
| `SlidesPerView` | `int` | `1` | Number of slides visible at once |
| `SpaceBetween` | `int` | `10` | Spacing between slides in pixels |
| `ShowPagination` | `bool` | `true` | Show pagination dots |
| `ShowNavigation` | `bool` | `false` | Show next/previous buttons |
| `Loop` | `bool` | `false` | Loop slides (jump to first after last) |
| `ClickablePercentage` | `bool` | `true` | Make pagination dots clickable |
| `KeyboardControl` | `bool` | `true` | Enable arrow key navigation |
| `MouseWheelControl` | `bool` | `false` | Enable mouse wheel navigation |
| `AutoplayDelay` | `int` | `0` | Auto-advance delay in ms (0 = disabled) |
| `AutoplayPauseOnHover` | `bool` | `true` | Pause autoplay on hover |
| `Height` | `string` | `"300px"` | Container height (px, %, auto, etc.) |
| `CssClass` | `string` | `null` | Custom CSS class for container |
| `OnSlideChange` | `EventCallback<int>` | - | Fires when active slide changes (index) |
| `OnReachEnd` | `EventCallback` | - | Fires when carousel reaches the end |
| `OnReachBeginning` | `EventCallback` | - | Fires when carousel reaches the beginning |

### Component Methods

```csharp
// Get the current slide index (0-based)
int index = await swiperComponent.GetCurrentSlideAsync();

// Navigate to specific slide
await swiperComponent.GoToSlideAsync(2);

// Go to next slide
await swiperComponent.NextSlideAsync();

// Go to previous slide
await swiperComponent.PreviousSlideAsync();
```

## Responsive Configuration

For responsive slides per view, wrap in a responsive container:

```razor
<MudContainer MaxWidth="MaxWidth.Large">
    <MudSwiper Slides="@items" 
               SlidesPerView="3"
               SpaceBetween="20"
               Height="300px" />
</MudContainer>
```

Or use CSS media queries:

```css
@media (max-width: 1200px) {
    .swiper { /* Styles for tablet */ }
}

@media (max-width: 600px) {
    .swiper { /* Styles for mobile */ }
}
```

## How It Works

- **CDN Loading**: Swiper.js and CSS are automatically loaded from jsDelivr CDN on first use
- **No npm Required**: Everything is handled through browser-based module loading
- **Vanilla Swiper Configuration**: Leverages the full power of Swiper.js configuration options
- **Blazor Integration**: Full interop for event callbacks and programmatic control

## Performance Tips

1. **Use Lazy Loading**: For large image collections, implement lazy loading with the `SlideTemplate`
2. **Throttle Events**: Use debouncing in `OnSlideChange` handlers for heavy operations
3. **Preload Images**: Pre-cache carousel images to prevent network delays
4. **Set Height Explicitly**: Always specify `Height` to prevent layout shifts

## Browser Support

Works in all modern browsers that support:
- ES2015 (ES6) modules
- Flex layout
- Touch events
- CSS custom properties

## License

Licensed under the **Apache License 2.0**. See LICENSE for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Dependencies

- **MudBlazor** 8.15+
- **.NET** 10.0+
- **Swiper.js** 12.x (loaded from CDN)

---

For more information on Swiper.js capabilities, visit [swiperjs.com](https://swiperjs.com/).
