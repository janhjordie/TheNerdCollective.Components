# TheNerdCollective.Services

A foundational services library providing base service abstractions, utilities, and integration helpers for The Nerd Collective component ecosystem. Includes Azure Blob Storage integration and configuration support.

## Overview

TheNerdCollective.Services provides essential service infrastructure for building robust, scalable applications. It includes abstractions, implementations, and extensions for common service patterns.

## Quick Start

### Installation

```bash
dotnet add package TheNerdCollective.Services
```

### Service Registration

Add services to your dependency injection container:

```csharp
using TheNerdCollective.Services.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Register services
builder.Services.AddNerdCollectiveServices();

var app = builder.Build();
```

## Included Services

### Azure Blob Storage Integration

Access Azure Blob Storage with easy configuration:

```csharp
// Configure in appsettings.json
{
  "AzureBlob": {
    "ConnectionString": "DefaultEndpointsProtocol=https;..."
  }
}

// Use in your services
var blobService = serviceProvider.GetRequiredService<IAzureBlobService>();
await blobService.UploadAsync("container", "file.txt", stream);
```

### Configuration Support

Built-in support for options patterns and configuration binding:

```csharp
var options = serviceProvider.GetRequiredService<IOptions<AzureBlobOptions>>();
var connectionString = options.Value.ConnectionString;
```

## Features

- **Azure Blob Storage Service** - Upload, download, and manage blobs
- **Configuration Options** - Type-safe configuration with `AzureBlobOptions`
- **Extension Methods** - Easy service registration with `ServiceCollectionExtensions`
- **Dependency Injection Ready** - Fully compatible with ASP.NET Core DI container

## Dependencies

- **Azure.Storage.Blobs** 12.23.0
- **Microsoft.Extensions.Options** 10.0.0
- **Microsoft.Extensions.Configuration** 10.0.0
- **System.ComponentModel.Annotations** 5.0.0
- **TheNerdCollective.Helpers** (internal)
- **.NET** 10.0+

## License

Apache License 2.0 - See LICENSE file for details

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)
