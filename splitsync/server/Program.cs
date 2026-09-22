using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using SplitSync.Api.Data;
using SplitSync.Api.Models;
using SplitSync.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(NormalizeConnectionString(builder.Configuration.GetConnectionString("Default"))));

builder.Services
    .AddIdentityCore<AppUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireDigit = false;
    })
    .AddEntityFrameworkStores<AppDbContext>();

builder.Services.AddScoped<UsernameGenerator>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<NotificationService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)
            ),
        };
    });

builder.Services.AddAuthorization();

// A bare host (e.g. "splitsync-client.onrender.com", see render.yaml), not a full origin URL.
var allowedOriginHost = builder.Configuration["Cors:AllowedOrigin"];
builder.Services.AddCors(options =>
{
    options.AddPolicy("Client", policy =>
    {
        if (!string.IsNullOrEmpty(allowedOriginHost))
        {
            policy.WithOrigins($"https://{allowedOriginHost}").AllowAnyHeader().AllowAnyMethod();
        }
    });
});

var app = builder.Build();

// Apply pending EF Core migrations on boot in Production only. Render's free tier doesn't
// support a separate pre-deploy step, so this runs inline instead. Gating on IsProduction()
// (local dev and the test suite both run as Development) keeps WebApplicationFactory-based
// tests from hitting this app's own (non-test) database registration before their service
// overrides are applied.
if (app.Environment.IsProduction())
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
});

app.UseHttpsRedirection();

app.UseCors("Client");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Render's managed Postgres exposes connection strings as postgres:// URIs; Npgsql needs
// the keyword=value format, so convert when that's what we're handed.
static string? NormalizeConnectionString(string? value)
{
    if (string.IsNullOrEmpty(value) || !value.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
    {
        return value;
    }

    if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
    {
        return value;
    }

    var userInfo = uri.UserInfo.Split(':', 2);
    var connectionStringBuilder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.TrimStart('/'),
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
        SslMode = SslMode.Require,
    };
    return connectionStringBuilder.ConnectionString;
}

public partial class Program;
