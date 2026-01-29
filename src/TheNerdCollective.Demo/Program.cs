using MudBlazor.Services;
using TheNerdCollective.Demo.Components;
using TheNerdCollective.Services.BlazorServer;
using TheNerdCollective.Blazor.SessionMonitor;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

// Add MudBlazor services
builder.Services.AddMudServices();

// Add session monitoring
builder.Services.AddSessionMonitoring();

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();


app.UseAntiforgery();

app.MapStaticAssets();
// Map reconnection status endpoint for the reconnection UI
app.MapBlazorReconnectionStatusEndpoint("/reconnection-status.json", async ctx =>
{
    var version = Assembly.GetEntryAssembly()?.GetName().Version?.ToString();
    return await Task.FromResult(new ReconnectionStatus
    {
        Status = "ok",
        ReconnectingMessage = "Reconnecting...",
        Version = version
    });
});
// Map session monitoring endpoints
app.MapSessionMonitoringEndpoints();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
