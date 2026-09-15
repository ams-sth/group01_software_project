using System.Net;
using System.Net.Http.Json;
using SplitSync.Api.Dtos;

namespace SplitSync.Api.Tests.Integration.Settlements;

public class SettlementsEndpointTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private async Task<(AuthResponse User, HttpClient Client)> NewAuthedClientAsync()
    {
        var client = _factory.CreateClient();
        var user = await TestUsers.RegisterAsync(client);
        TestUsers.AuthorizeAs(client, user);
        return (user, client);
    }

    private async Task<(Guid GroupId, AuthResponse Creator, HttpClient CreatorClient, AuthResponse Member, HttpClient MemberClient)> NewGroupOfTwoAsync()
    {
        var (creator, creatorClient) = await NewAuthedClientAsync();
        var group = await (await creatorClient.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();
        var (member, memberClient) = await NewAuthedClientAsync();
        await creatorClient.PostAsJsonAsync($"/api/groups/{group!.Id}/members", new { username = member.Username });
        return (group.Id, creator, creatorClient, member, memberClient);
    }

    [Fact]
    public async Task BalanceShowsWhatYourFlatmateOwesYouAfterAnExpense()
    {
        var (groupId, creator, creatorClient, member, memberClient) = await NewGroupOfTwoAsync();
        await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "House groceries",
            amount = 60.00m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null },
                             new { username = member.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        });

        var creatorBalances = await (await creatorClient.GetAsync($"/api/groups/{groupId}/balances")).Content.ReadFromJsonAsync<GroupBalancesResponse>();
        var memberBalances = await (await memberClient.GetAsync($"/api/groups/{groupId}/balances")).Content.ReadFromJsonAsync<GroupBalancesResponse>();

        Assert.Equal(30.00m, creatorBalances!.YouAreOwedTotal);
        Assert.Equal(0m, creatorBalances.YouOweTotal);
        Assert.Equal(30.00m, memberBalances!.YouOweTotal);
        Assert.Equal(0m, memberBalances.YouAreOwedTotal);
    }

    [Fact]
    public async Task PayingSomeoneBackClearsWhatYouOweThem()
    {
        var (groupId, creator, creatorClient, member, memberClient) = await NewGroupOfTwoAsync();
        await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "House groceries",
            amount = 60.00m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null },
                             new { username = member.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        });

        var recordResponse = await memberClient.PostAsJsonAsync($"/api/groups/{groupId}/settlements", new
        {
            username = creator.Username,
            amount = 30.00m,
            iPaid = true,
        });
        recordResponse.EnsureSuccessStatusCode();

        var memberBalances = await (await memberClient.GetAsync($"/api/groups/{groupId}/balances")).Content.ReadFromJsonAsync<GroupBalancesResponse>();
        Assert.Empty(memberBalances!.Balances);
        Assert.Equal(0m, memberBalances.YouOweTotal);
    }

    [Fact]
    public async Task CantSettleUpWithYourself()
    {
        var (user, client) = await NewAuthedClientAsync();
        var group = await (await client.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();

        var response = await client.PostAsJsonAsync($"/api/groups/{group!.Id}/settlements", new
        {
            username = user.Username,
            amount = 10.00m,
            iPaid = true,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task OnlyGroupMembersCanRecordASettlement()
    {
        var (groupId, creator, _, _, _) = await NewGroupOfTwoAsync();
        var (_, outsiderClient) = await NewAuthedClientAsync();

        var response = await outsiderClient.PostAsJsonAsync($"/api/groups/{groupId}/settlements", new
        {
            username = creator.Username,
            amount = 10.00m,
            iPaid = true,
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CantSettleUpWithSomeoneOutsideTheGroup()
    {
        var (groupId, _, creatorClient, _, _) = await NewGroupOfTwoAsync();
        var (outsider, _) = await NewAuthedClientAsync();

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/settlements", new
        {
            username = outsider.Username,
            amount = 10.00m,
            iPaid = true,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CantRecordAZeroDollarSettlement()
    {
        var (groupId, creator, _, _, memberClient) = await NewGroupOfTwoAsync();

        var response = await memberClient.PostAsJsonAsync($"/api/groups/{groupId}/settlements", new
        {
            username = creator.Username,
            amount = 0m,
            iPaid = true,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ARecordedSettlementShowsUpInTheList()
    {
        var (groupId, creator, _, member, memberClient) = await NewGroupOfTwoAsync();
        await memberClient.PostAsJsonAsync($"/api/groups/{groupId}/settlements", new { username = creator.Username, amount = 15.00m, iPaid = true });

        var response = await memberClient.GetAsync($"/api/groups/{groupId}/settlements");

        var settlements = await response.Content.ReadFromJsonAsync<List<SettlementResponse>>();
        Assert.Single(settlements!);
        Assert.Equal(member.Username, settlements![0].FromUsername);
        Assert.Equal(creator.Username, settlements[0].ToUsername);
        Assert.Equal(15.00m, settlements[0].Amount);
    }
}
