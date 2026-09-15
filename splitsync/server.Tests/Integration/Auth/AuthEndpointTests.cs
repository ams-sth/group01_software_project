using System.Net;
using System.Net.Http.Json;
using SplitSync.Api.Dtos;

namespace SplitSync.Api.Tests.Integration.Auth;

public class AuthEndpointTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory = new();
    private readonly HttpClient _client;

    public AuthEndpointTests()
    {
        _client = _factory.CreateClient();
    }

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task CanRegisterANewAccount()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new { email = "priya@example.com", password = "flatmates2026" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.False(string.IsNullOrWhiteSpace(body!.Token));
        Assert.Equal("priya", body.Username);
        Assert.Equal("priya@example.com", body.Email);
    }

    [Fact]
    public async Task CantRegisterWithAnEmailThatsAlreadyTaken()
    {
        await TestUsers.RegisterAsync(_client, email: "dev@example.com");

        var response = await _client.PostAsJsonAsync("/api/auth/register", new { email = "dev@example.com", password = "flatmates2026" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task ShortPasswordsAreRejected()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new { email = "shanti@example.com", password = "abc123" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CanLogInWithEmail()
    {
        await TestUsers.RegisterAsync(_client, email: "marco@example.com", password: "billsplitter1");

        var response = await _client.PostAsJsonAsync("/api/auth/login", new { identifier = "marco@example.com", password = "billsplitter1" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CanLogInWithTheGeneratedUsernameInstead()
    {
        var registered = await TestUsers.RegisterAsync(_client, email: "aisha@example.com", password: "billsplitter1");

        var response = await _client.PostAsJsonAsync("/api/auth/login", new { identifier = registered.Username, password = "billsplitter1" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task WrongPasswordIsRejected()
    {
        await TestUsers.RegisterAsync(_client, email: "noor@example.com", password: "billsplitter1");

        var response = await _client.PostAsJsonAsync("/api/auth/login", new { identifier = "noor@example.com", password = "wrongpassword" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task LoggingInAsSomeoneWhoDoesntExistIsRejected()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new { identifier = "ghost@example.com", password = "whatever123" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CantViewYourProfileWithoutLoggingIn()
    {
        var response = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CanViewYourOwnProfileOnceLoggedIn()
    {
        var registered = await TestUsers.RegisterAsync(_client, email: "callum@example.com");
        TestUsers.AuthorizeAs(_client, registered);

        var response = await _client.GetAsync("/api/auth/me");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.Equal(registered.Username, body!["username"]);
        Assert.Equal("callum@example.com", body["email"]);
    }

    [Fact]
    public async Task CantDeleteYourAccountWhileYouStillOwnAGroup()
    {
        var registered = await TestUsers.RegisterAsync(_client);
        TestUsers.AuthorizeAs(_client, registered);
        await _client.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" });

        var response = await _client.DeleteAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task DeletingYourAccountActuallyLogsYouOutForGood()
    {
        var registered = await TestUsers.RegisterAsync(_client, email: "leo@example.com", password: "movingoutday1");
        TestUsers.AuthorizeAs(_client, registered);

        var deleteResponse = await _client.DeleteAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new { identifier = "leo@example.com", password = "movingoutday1" });
        Assert.Equal(HttpStatusCode.Unauthorized, loginResponse.StatusCode);
    }
}
