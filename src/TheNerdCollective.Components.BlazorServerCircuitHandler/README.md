# TheNerdCollective.Components.BlazorServerCircuitHandler

A production-ready Blazor Server circuit reconnection handler with automatic reconnection UI and graceful error handling.

## Overview

This package provides a drop-in Razor component that handles Blazor Server circuit reconnection scenarios with:
- Automatic reconnection with exponential backoff
- Silent reconnection for brief interruptions
- Professional reconnection overlay with countdown timer
- Graceful handling of server restarts and deployments

## Quick Start

### Installation

```bash
dotnet add package TheNerdCollective.Components.BlazorServerCircuitHandler
```

### Setup

1. **Add to your root component** (`App.razor`):
```razor
<Routes @rendermode="InteractiveServer" />
<CircuitReconnectionHandler @rendermode="InteractiveServer" />
```

2. **Import in `_Imports.razor`**:
```csharp
@using TheNerdCollective.Components.BlazorServerCircuitHandler
```

3. **Done!** The component handles everything automatically.

## Features

✅ **Automatic Reconnection** - Infinite reconnection with exponential backoff (1s → 5s)  
✅ **Silent First Attempts** - No UI shown for quick reconnects (first 5 attempts)  
✅ **Professional UI** - Beautiful reconnection overlay with countdown timer  
✅ **Error Suppression** - Filters out MudBlazor and expected disconnection errors  
✅ **Graceful Fallback** - Auto-reload when circuits expire  
✅ **Zero Configuration** - Works out of the box  

## How It Works

### Scenario 1: Brief Network Interruption
```
Connection lost → 5 silent reconnection attempts → Connected
Result: User sees nothing
```

### Scenario 2: Extended Disconnection
```
Connection lost → 5 failed attempts → UI overlay shown
User waits or clicks "Reload Now" → Connection restored
Result: Overlay disappears, app continues normally
```

### Scenario 3: Server Restart/Deployment
```
Circuit expires → Auto-reload triggered
Result: Fresh session with new app instance
```

## Configuration

The handler uses sensible defaults, but you can customize circuit retention in your host's `Program.cs`:

```csharp
builder.Services.Configure<CircuitOptions>(options =>
{
    options.DisconnectedCircuitRetentionPeriod = TimeSpan.FromMinutes(10);
    options.JSInteropDefaultCallTimeout = TimeSpan.FromSeconds(30);
    options.DetailedErrors = builder.Environment.IsDevelopment();
});
```

## Dependencies

- **MudBlazor** 8.15+ (optional, but recommended)
- **.NET** 10.0+
- **Blazor Server** enabled

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## License

Apache License 2.0 - See LICENSE file for details

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)

By [Jan Hjørdie](https://github.com/janhjordie/) - [LinkedIn](https://www.linkedin.com/in/janhjordie/) | [Dev.to](https://dev.to/janhjordie)

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions, visit:
- GitHub: https://github.com/janhjordie/TheNerdCollective.Components

## Version History

- **1.0.0** (2025-12-19) - Initial release with infinite reconnection handler, professional UI, and error suppression

---

**Built with ❤️ for the Blazor Server community**
