# TheNerdCollective.Services

A comprehensive services library providing foundational abstractions, utilities, and integration helpers for building scalable applications.

## Overview

TheNerdCollective.Services provides essential service infrastructure as a collection of specialized packages. Choose the package that matches your needs:

- **TheNerdCollective.Services** - Core Azure Blob Storage service with full CRUD operations
- **TheNerdCollective.Services.BlazorServer** - Blazor Server circuit configuration and graceful shutdown

## TheNerdCollective.Services

Core service library with Azure Blob Storage integration for file operations and management.

### Installation

```bash
dotnet add package TheNerdCollective.Services --version 0.1.5
```

### Setup

```csharp
using TheNerdCollective.Services.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Register Azure Blob Storage service
builder.Services.AddAzureBlobService(builder.Configuration);

var app = builder.Build();
```

### Features

✅ **Azure Blob Storage Service** - Upload, download, delete, list, and manage blobs  
✅ **Type-Safe Configuration** - `AzureBlobOptions` with validation  
✅ **Multi-Container Support** - Default container + per-operation container selection  
✅ **Compression Support** - Native compress/decompress operations  
✅ **DI Compatible** - Built for ASP.NET Core dependency injection  
✅ **Async-First API** - All operations are async/await compatible

### Configuration

Configure in `appsettings.json`:

```json
{
  "AzureBlob": {
    "ConnectionString": "DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net",
    "ContainerName": "default-container-name"
  }
}
```

Or via environment variables:
```bash
AzureBlob__ConnectionString=DefaultEndpointsProtocol=https;...
AzureBlob__ContainerName=my-container
```

### Usage

#### Upload to Default Container

```csharp
[Inject] private AzureBlobService BlobService { get; set; } = null!;

// Upload file bytes
byte[] fileData = File.ReadAllBytes("image.png");
await BlobService.UploadAsync(fileData, "images/event-cards/image.png");
```

#### Upload to Specific Container

```csharp
// Upload to a specific container (creates if not exists)
await BlobService.UploadAsync(fileData, "photos", "event-cards/image.png");
```

#### Download File

```csharp
// Download from default container
byte[] data = await BlobService.DownloadAsync("images/event-cards/image.png");

// Download from specific container
byte[] data = await BlobService.DownloadAsync("photos", "event-cards/image.png");
```

#### Delete File

```csharp
// Delete from specific container
await BlobService.DeleteAsync("photos", "event-cards/image.png");
```

#### List Files in Container

```csharp
// List all files in default container
var files = await BlobService.FilesAsync();

// List all files in specific container
var files = await BlobService.FilesAsync("photos");

foreach (var blob in files)
{
    Console.WriteLine($"Name: {blob.Name}, Size: {blob.Properties.ContentLength}");
}
```

#### Compression Support

```csharp
// Compress and upload
byte[] largeData = GetLargeDataSet();
await BlobService.CompressAndUploadAsync(largeData, "archive/large-file.zip");

// Download and decompress
byte[] decompressed = await BlobService.DownloadAndDecompressAsync("archive/large-file.zip");

// Compress and upload to specific container
await BlobService.CompressAndUploadAsync(largeData, "archives", "data.zip");

// Download and decompress from specific container
byte[] decompressed = await BlobService.DownloadAndDecompressAsync("archives", "data.zip");
```

### API Reference

#### AzureBlobService

##### `UploadAsync(byte[] data, string destinationPath)`
Uploads data to the default blob container.

##### `UploadAsync(byte[] data, string container, string destinationPath)`
Uploads data to a specific blob container (creates container if not exists).

##### `DeleteAsync(string container, string destinationPath)`
Deletes a blob from the specified container.

##### `DownloadAsync(string sourcePath)`
Downloads data from the default blob container.

##### `DownloadAsync(string container, string sourcePath)`
Downloads data from a specific blob container.

##### `FilesAsync()`
Lists all blobs in the default container.

##### `FilesAsync(string container)`
Lists all blobs in a specific container.

##### `CompressAndUploadAsync(byte[] data, string destinationPath)`
Compresses data and uploads to the default container.

##### `CompressAndUploadAsync(byte[] data, string container, string destinationPath)`
Compresses data and uploads to a specific container.

##### `DownloadAndDecompressAsync(string sourcePath)`
Downloads and decompresses data from the default container.

##### `DownloadAndDecompressAsync(string container, string sourcePath)`
Downloads and decompresses data from a specific container.

### Configuration Options

`AzureBlobOptions` class:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `ConnectionString` | `string` | ✅ Yes | Azure Storage connection string from portal |
| `ContainerName` | `string` | ✅ Yes | Default blob container name for operations |

### Example: Event Card Image Upload

```csharp
// In a Blazor component handling file upload
@using Azure.Storage.Blobs

@inject AzureBlobService BlobService

<MudFileUpload T="IBrowserFile" OnFilesChanged="OnImageSelected" />

@code {
    private async Task OnImageSelected(InputFileChangeEventArgs e)
    {
        var file = e.File;
        using var stream = file.OpenReadStream(maxAllowedSize: 5_242_880); // 5 MB
        byte[] fileData = new byte[stream.Length];
        await stream.ReadAsync(fileData, 0, (int)stream.Length);
        
        // Upload to blob storage
        string path = $"event-card-styles/{Guid.NewGuid()}-{file.Name}";
        await BlobService.UploadAsync(fileData, "event-images", path);
        
        // Return URL for storage (CDN or direct access)
        string imageUrl = $"https://{accountName}.blob.core.windows.net/event-images/{path}";
    }
}
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
