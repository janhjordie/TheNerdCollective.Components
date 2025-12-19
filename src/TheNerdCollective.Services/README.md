# TheNerdCollective.Services

A comprehensive services library providing foundational abstractions, utilities, and integration helpers for building scalable applications.

## Overview

TheNerdCollective.Services provides essential service infrastructure as a collection of specialized packages. Choose the package that matches your needs:

- **TheNerdCollective.Services** - Core Azure Blob Storage and configuration support
- **TheNerdCollective.Services.BlazorServer** - Blazor Server circuit configuration and graceful shutdown

## TheNerdCollective.Services

Core service library with Azure Blob Storage integration.

### Installation

```bash
dotnet add package TheNerdCollective.Services
```

### Setup

```csharp
using TheNerdCollective.Services.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddNerdCollectiveServices();

var app = builder.Build();
```

### Features

✅ **Azure Blob Storage Service** - Upload, download, and manage blobs  
✅ **Type-Safe Configuration** - `AzureBlobOptions` with validation  
✅ **Extension Methods** - Easy service registration  
✅ **DI Compatible** - Built for ASP.NET Core dependency injection  

### Configuration

```json
{
  "AzureBlob": {
    "ConnectionString": "DefaultEndpointsProtocol=https;..."
  }
}
```

### Usage

```csharp
var blobService = serviceProvider.GetRequiredService<IAzureBlobService>();
await blobService.UploadAsync("container", "file.txt", stream);
```

---

## TheNerdCollective.Services.BlazorServer

Specialized service library for Blazor Server circuit management and graceful shutdown.

### Installation

```bash
dotnet add package TheNerdCollective.Services.BlazorServer
```

### Setup

```csharp
using TheNerdCollective.Services.BlazorServer;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddBlazorServerServices(builder.Configuration, builder.Environment);
builder.Host.ConfigureBlazorServerShutdown();

var app = builder.Build();
```

### Features

✅ **Circuit Configuration** - Sensible defaults for production Blazor Server apps  
✅ **Graceful Shutdown** - Coordinated cleanup when app terminates  
✅ **Configurable Options** - Customize via `CircuitOptions` section  
✅ **Framework Agnostic** - Works with any Blazor Server host  

### Configuration

```json
{
  "CircuitOptions": {
    "DisconnectedCircuitRetentionPeriod": "00:10:00",
    "JSInteropDefaultCallTimeout": "00:00:30"
  }
}
```

---

## Dependencies

- **Azure.Storage.Blobs** 12.23.0 (Services only)
- **Microsoft.Extensions.Options** 10.0.0
- **Microsoft.Extensions.Configuration** 10.0.0
- **Microsoft.AspNetCore.App** (BlazorServer only)
- **.NET** 10.0+

## License

Apache License 2.0 - See LICENSE file for details

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)

By [Jan Hjørdie](https://github.com/janhjordie/) - [LinkedIn](https://www.linkedin.com/in/janhjordie/) | [Dev.to](https://dev.to/janhjordie)
