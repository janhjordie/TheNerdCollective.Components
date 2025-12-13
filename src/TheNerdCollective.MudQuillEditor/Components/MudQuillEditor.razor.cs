// Licensed under the Apache License, Version 2.0.
// See LICENSE file in the project root for full license information.

using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace TheNerdCollective.MudQuillEditor;

/// <summary>
/// A Blazor rich-text editor component wrapping Quill with MudBlazor styling.
/// </summary>
public partial class MudQuillEditor : IAsyncDisposable
{
    [Inject] private IJSRuntime JS { get; set; } = null!;

    private string _elementId = $"mud-quill-{Guid.NewGuid():N}";
    private DotNetObjectReference<MudQuillEditor>? _objRef;
    private bool _initialized;
    private object? _previousToolbar;

    /// <summary>
    /// Gets or sets the HTML content of the editor.
    /// </summary>
    [Parameter] public string? Value { get; set; }

    /// <summary>
    /// Fires when the editor content changes.
    /// </summary>
    [Parameter] public EventCallback<string?> ValueChanged { get; set; }

    /// <summary>
    /// Gets or sets whether the editor is read-only.
    /// </summary>
    [Parameter] public bool ReadOnly { get; set; }

    /// <summary>
    /// Gets or sets the Quill theme ("snow" or "bubble").
    /// </summary>
    [Parameter] public string Theme { get; set; } = "snow";

    /// <summary>
    /// Gets or sets the minimum height of the editor (CSS value).
    /// </summary>
    [Parameter] public string? MinHeight { get; set; }

    /// <summary>
    /// Gets or sets the maximum height of the editor (CSS value). Default is 150px.
    /// </summary>
    [Parameter] public string MaxHeight { get; set; } = "150px";

    /// <summary>
    /// Gets or sets the toolbar modules. Default includes bold, italic, underline, lists, link, and image.
    /// </summary>
    [Parameter] public object? Toolbar { get; set; }

    /// <summary>
    /// Gets or sets the placeholder text shown when editor is empty.
    /// </summary>
    [Parameter] public string? Placeholder { get; set; }

    protected override async Task OnParametersSetAsync()
    {
        if (_initialized)
        {
            // Update read-only state
            await JS.InvokeVoidAsync("mudQuillEditor.setReadOnly", _elementId, ReadOnly);
            
            // Update placeholder
            await JS.InvokeVoidAsync("mudQuillEditor.setPlaceholder", _elementId, Placeholder ?? string.Empty);
        }

        await base.OnParametersSetAsync();
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!_initialized && firstRender)
        {
            if (_objRef == null)
                _objRef = DotNetObjectReference.Create(this);

            const int maxAttempts = 6;
            int attempt = 0;

            while (attempt < maxAttempts && !_initialized)
            {
                attempt++;
                
                try
                {
                    await JS.InvokeVoidAsync("mudQuillEditor.initialize", _elementId, _objRef, new { readOnly = ReadOnly, theme = Theme, value = Value, minHeight = MinHeight, maxHeight = MaxHeight, toolbar = Toolbar, placeholder = Placeholder });
                    _initialized = true;
                    break;
                }
                catch
                {
                    if (attempt < maxAttempts)
                    {
                        await Task.Delay(500);
                    }
                }
            }
        }
        else if (_initialized && !firstRender)
        {
            // Reinitialize if toolbar changes (toolbar can't be updated live)
            if (!ToolbarEqual(_previousToolbar, Toolbar))
            {
                _previousToolbar = Toolbar;
                await JS.InvokeVoidAsync("mudQuillEditor.dispose", _elementId);
                _initialized = false;
                
                if (_objRef == null)
                    _objRef = DotNetObjectReference.Create(this);

                try
                {
                    await JS.InvokeVoidAsync("mudQuillEditor.initialize", _elementId, _objRef, new { readOnly = ReadOnly, theme = Theme, value = Value, minHeight = MinHeight, maxHeight = MaxHeight, toolbar = Toolbar, placeholder = Placeholder });
                    _initialized = true;
                }
                catch
                {
                    // Ignore errors
                }
            }
        }
    }

    private bool ToolbarEqual(object? a, object? b)
    {
        if (ReferenceEquals(a, b)) return true;
        if (a == null || b == null) return a == b;
        return System.Text.Json.JsonSerializer.Serialize(a) == System.Text.Json.JsonSerializer.Serialize(b);
    }

    /// <summary>
    /// Sets the editor HTML content programmatically.
    /// </summary>
    public async Task SetHtmlAsync(string? html)
    {
        if (!_initialized) return;
        await JS.InvokeVoidAsync("mudQuillEditor.setHtml", _elementId, html ?? string.Empty);
        Value = html;
        await ValueChanged.InvokeAsync(Value);
    }

    /// <summary>
    /// Gets the editor HTML content programmatically.
    /// </summary>
    public async Task<string?> GetHtmlAsync()
    {
        if (!_initialized) return Value;
        return await JS.InvokeAsync<string>("mudQuillEditor.getHtml", _elementId);
    }

    /// <summary>
    /// Invoked by JavaScript when the editor content changes.
    /// </summary>
    [JSInvokable]
    public async Task NotifyValueChanged(string html)
    {
        Value = html;
        await ValueChanged.InvokeAsync(Value);
    }

/// <summary>
    /// Disposes the editor and cleans up resources.
    /// </summary>
    public async ValueTask DisposeAsync()
    {
        if (_initialized)
        {
            try
            {
                await JS.InvokeVoidAsync("mudQuillEditor.dispose", _elementId);
            }
            catch (JSDisconnectedException)
            {
                // Circuit was disconnected; JS interop is no longer available
                // This is expected during page unload/reload
            }
            catch
            {
                // Ignore other errors during disposal
            }
            finally
            {
                _objRef?.Dispose();
            }        }
    }
}