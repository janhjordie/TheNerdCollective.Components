# TheNerdCollective.Services.BlazorServer

A lightweight service library for configuring Blazor Server circuit options and graceful shutdown handling.

## Overview

TheNerdCollective.Services.BlazorServer provides essential configuration and lifecycle management for Blazor Server applications, including circuit options tuning and coordinated shutdown handling for production stability.

## Quick Start

### Installation

```bash
dotnet add package TheNerdCollective.Services.BlazorServer
```

### Setup

1. **Register services in `Program.cs`**:
```csharp
using TheNerdCollective.Services.BlazorServer;

var builder = WebApplication.CreateBuilder(args);

// Configure Blazor Server circuit options
builder.Services.AddBlazorServerServices(builder.Configuration, builder.Environment);
builder.Host.ConfigureBlazorServerShutdown();

var app = builder.Build();
```

2. **Configure in `appsettings.json` (optional)**:
```json
{
  "CircuitOptions": {
    "DisconnectedCircuitRetentionPeriod": "00:10:00",
    "JSInteropDefaultCallTimeout": "00:00:30"
  }
}
```

## Features

✅ **Circuit Configuration** - Sensible defaults for production Blazor Server apps  
✅ **Graceful Shutdown** - Coordinated cleanup when app terminates  
✅ **Configurable Options** - Customize via `CircuitOptions` section  
✅ **Framework Agnostic** - Works with any Blazor Server host  

## Configuration

The service uses production-recommended defaults but can be customized:

```csharp
builder.Services.Configure<CircuitOptions>(options =>
{
    // Keep circuits in memory longer for graceful reconnection
    options.DisconnectedCircuitRetentionPeriod = TimeSpan.FromMinutes(10);
    
    // Allow more time for JS interop in complex scenarios
    options.JSInteropDefaultCallTimeout = TimeSpan.FromSeconds(30);
    
    // Enable detailed errors in development only
    options.DetailedErrors = builder.Environment.IsDevelopment();
});
```

## Dependencies

- **Microsoft.AspNetCore.App** (framework reference)
- **.NET** 10.0+

## License

Apache License 2.0 - See LICENSE file for details

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)

By [Jan Hjørdie](https://github.com/janhjordie/) - [LinkedIn](https://www.linkedin.com/in/janhjordie/) | [Dev.to](https://dev.to/janhjordie)
