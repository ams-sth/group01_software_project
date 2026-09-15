using System.Net;
using System.Net.Http.Json;
using SplitSync.Api.Dtos;

namespace SplitSync.Api.Tests.Integration.Groups;

public class GroupsEndpointTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory = new();
    private readonly HttpClient _client;

    public GroupsEndpointTests()
    {
        _client = _factory.CreateClient();
    }

    public void Dispose() => _factory.Dispose();

    private async Task<(AuthResponse User, HttpClient Client)> NewAuthedClientAsync()
    {
        var client = _factory.CreateClient();
        var user = await TestUsers.RegisterAsync(client);
        TestUsers.AuthorizeAs(client, user);
        return (user, client);
    }

    [Fact]
    public async Task CreatingAGroupMakesYouItsOnlyMember()
    {
        var (creator, client) = await NewAuthedClientAsync();

        var response = await client.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" });

        response.EnsureSuccessStatusCode();
        var group = await response.Content.ReadFromJsonAsync<GroupResponse>();
        Assert.Equal("Flat 4B", group!.Name);
        Assert.Equal(creator.Username, group.CreatorUsername);
        Assert.Equal([creator.Username], group.MemberUsernames);
    }

    [Fact]
    public async Task YourGroupListOnlyShowsGroupsYoureActuallyIn()
    {
        var (_, clientA) = await NewAuthedClientAsync();
        var (_, clientB) = await NewAuthedClientAsync();
        await clientA.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" });
        await clientB.PostAsJsonAsync("/api/groups", new { name = "Bali Trip 2026" });

        var response = await clientA.GetAsync("/api/groups");

        var groups = await response.Content.ReadFromJsonAsync<List<GroupResponse>>();
        Assert.Single(groups!);
        Assert.Equal("Flat 4B", groups![0].Name);
    }

    [Fact]
    public async Task CreatorCanRenameTheGroup()
    {
        var (_, client) = await NewAuthedClientAsync();
        var created = await (await client.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();

        var response = await client.PatchAsJsonAsync($"/api/groups/{created!.Id}", new { name = "The Attic" });

        response.EnsureSuccessStatusCode();
        var renamed = await response.Content.ReadFromJsonAsync<GroupResponse>();
        Assert.Equal("The Attic", renamed!.Name);
    }

    [Fact]
    public async Task OnlyTheCreatorCanRenameTheGroup()
    {
        var (creator, creatorClient) = await NewAuthedClientAsync();
        var created = await (await creatorClient.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();

        var (member, memberClient) = await NewAuthedClientAsync();
        await creatorClient.PostAsJsonAsync($"/api/groups/{created!.Id}/members", new { username = member.Username });

        var response = await memberClient.PatchAsJsonAsync($"/api/groups/{created.Id}", new { name = "Hijacked" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task OnlyTheCreatorCanDeleteTheGroup()
    {
        var (creator, creatorClient) = await NewAuthedClientAsync();
        var created = await (await creatorClient.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();

        var (member, memberClient) = await NewAuthedClientAsync();
        await creatorClient.PostAsJsonAsync($"/api/groups/{created!.Id}/members", new { username = member.Username });

        var response = await memberClient.DeleteAsync($"/api/groups/{created.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreatorCanAddANewMember()
    {
        var (_, creatorClient) = await NewAuthedClientAsync();
        var created = await (await creatorClient.PostAsJsonAsync("/api/groups", new { name = "Bali Trip 2026" })).Content.ReadFromJsonAsync<GroupResponse>();
        var newMember = await TestUsers.RegisterAsync(_factory.CreateClient());

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{created!.Id}/members", new { username = newMember.Username });

        response.EnsureSuccessStatusCode();
        var group = await response.Content.ReadFromJsonAsync<GroupResponse>();
        Assert.Contains(newMember.Username, group!.MemberUsernames);
    }

    [Fact]
    public async Task CantAddSomeoneWhosAlreadyInTheGroup()
    {
        var (_, creatorClient) = await NewAuthedClientAsync();
        var created = await (await creatorClient.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();
        var newMember = await TestUsers.RegisterAsync(_factory.CreateClient());
        await creatorClient.PostAsJsonAsync($"/api/groups/{created!.Id}/members", new { username = newMember.Username });

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{created.Id}/members", new { username = newMember.Username });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task TheCreatorCantBeRemovedAsAMember()
    {
        var (creator, creatorClient) = await NewAuthedClientAsync();
        var created = await (await creatorClient.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();

        var response = await creatorClient.DeleteAsync($"/api/groups/{created!.Id}/members/{creator.Username}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task TheCreatorCantLeaveTheirOwnGroup()
    {
        var (_, creatorClient) = await NewAuthedClientAsync();
        var created = await (await creatorClient.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();

        var response = await creatorClient.PostAsync($"/api/groups/{created!.Id}/leave", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AMemberCanLeaveTheGroup()
    {
        var (_, creatorClient) = await NewAuthedClientAsync();
        var created = await (await creatorClient.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();
        var (member, memberClient) = await NewAuthedClientAsync();
        await creatorClient.PostAsJsonAsync($"/api/groups/{created!.Id}/members", new { username = member.Username });

        var response = await memberClient.PostAsync($"/api/groups/{created.Id}/leave", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task CantJoinAGroupYoureAlreadyIn()
    {
        var (_, client) = await NewAuthedClientAsync();
        var created = await (await client.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();

        var response = await client.PostAsync($"/api/groups/{created!.Id}/join", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }
}
