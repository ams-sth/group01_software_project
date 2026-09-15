using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading;
using SplitSync.Api.Dtos;

namespace SplitSync.Api.Tests.Integration;

public static class TestUsers
{
    private static readonly string[] Names = ["priya", "dev", "shanti", "marco", "aisha", "noor", "callum", "leo"];
    private static int _nextName;

    public static async Task<AuthResponse> RegisterAsync(HttpClient client, string? email = null, string password = "flatmates2026")
    {
        var n = Interlocked.Increment(ref _nextName);
        email ??= $"{Names[n % Names.Length]}{n}@example.com";
        var response = await client.PostAsJsonAsync("/api/auth/register", new { email, password });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    public static void AuthorizeAs(HttpClient client, AuthResponse auth)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
    }
}
