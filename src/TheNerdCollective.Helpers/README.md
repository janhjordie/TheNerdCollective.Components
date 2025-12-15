# TheNerdCollective.Helpers

A utility library providing essential helper methods for common operations in .NET applications, including file I/O, date/time handling, stream conversions, and CSV processing.

## Overview

This package contains reusable utility classes designed to simplify common programming tasks across your applications. It's designed to be lightweight, dependency-minimal, and performant.

## Quick Start

### Installation

```bash
dotnet add package TheNerdCollective.Helpers
```

### Usage

#### File Operations
```csharp
using TheNerdCollective.Helpers;

// File I/O helpers
var fileContent = FileHelpers.ReadAllText("path/to/file.txt");
FileHelpers.WriteAllText("output.txt", content);
```

#### Date/Time Operations
```csharp
using TheNerdCollective.Helpers;

var formattedDate = DateHelpers.Format(DateTime.Now, "yyyy-MM-dd");
```

#### Stream & Byte Conversions
```csharp
using TheNerdCollective.Helpers;

var byteArray = StreamByteHelpers.StreamToByteArray(stream);
var stream = StreamByteHelpers.ByteArrayToStream(bytes);
```

#### CSV Processing
```csharp
using TheNerdCollective.Helpers;

var records = CsvHelpers.ReadFromFile<MyRecord>("data.csv");
CsvHelpers.WriteToFile("output.csv", records);
```

## Included Helpers

- **FileHelpers** - File I/O operations (read, write, delete)
- **DateHelpers** - Date and time formatting and manipulation
- **StreamByteHelpers** - Conversions between streams and byte arrays
- **CsvHelpers** - CSV file reading and writing with strongly-typed records
- **StringExtensions** - String manipulation extension methods
- **MimeTypeExtensions** - MIME type detection and handling
- **ListToStringJoinConverter** - JSON converter for list-to-string serialization

## Dependencies

- **CsvHelper** 33.0.1
- **Newtonsoft.Json** 13.0.3
- **.NET** 10.0+

## License

Apache License 2.0 - See LICENSE file for details

## Repository

[TheNerdCollective.Components on GitHub](https://github.com/janhjordie/TheNerdCollective.Components)

---

Built with ❤️ by [The Nerd Collective Aps](https://www.thenerdcollective.dk/)
