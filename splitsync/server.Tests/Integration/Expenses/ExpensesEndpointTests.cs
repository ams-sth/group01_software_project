using System.Net;
using System.Net.Http.Json;
using SplitSync.Api.Dtos;

namespace SplitSync.Api.Tests.Integration.Expenses;

public class ExpensesEndpointTests : IDisposable
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
    public async Task SplittingEquallyBetweenTwoPeopleWorksOut()
    {
        var (groupId, creator, creatorClient, member, _) = await NewGroupOfTwoAsync();

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "Weekly groceries",
            amount = 10.00m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null },
                             new { username = member.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        });

        response.EnsureSuccessStatusCode();
        var expense = await response.Content.ReadFromJsonAsync<ExpenseResponse>();
        Assert.Equal(2, expense!.Shares.Count);
        Assert.Equal(10.00m, expense.Shares.Sum(s => s.Amount));
        Assert.All(expense.Shares, s => Assert.Equal(5.00m, s.Amount));
    }

    [Fact]
    public async Task SplittingEquallyBetweenThreePeopleDoesntLoseACent()
    {
        var (creator, creatorClient) = await NewAuthedClientAsync();
        var group = await (await creatorClient.PostAsJsonAsync("/api/groups", new { name = "Bali Trip 2026" })).Content.ReadFromJsonAsync<GroupResponse>();
        var (memberB, _) = await NewAuthedClientAsync();
        var (memberC, _) = await NewAuthedClientAsync();
        await creatorClient.PostAsJsonAsync($"/api/groups/{group!.Id}/members", new { username = memberB.Username });
        await creatorClient.PostAsJsonAsync($"/api/groups/{group.Id}/members", new { username = memberC.Username });

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{group.Id}/expenses", new
        {
            description = "Villa (3 nights)",
            amount = 10.00m,
            splitMethod = "equal",
            splits = new[]
            {
                new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null },
                new { username = memberB.Username, amount = (decimal?)null, percentage = (decimal?)null },
                new { username = memberC.Username, amount = (decimal?)null, percentage = (decimal?)null },
            },
        });

        var expense = await response.Content.ReadFromJsonAsync<ExpenseResponse>();
        Assert.Equal(10.00m, expense!.Shares.Sum(s => s.Amount));
    }

    [Fact]
    public async Task UnequalSplitsHaveToActuallyAddUpToTheTotal()
    {
        var (groupId, creator, creatorClient, member, _) = await NewGroupOfTwoAsync();

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "Internet bill",
            amount = 64.99m,
            splitMethod = "unequal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)30.00m, percentage = (decimal?)null },
                             new { username = member.Username, amount = (decimal?)30.00m, percentage = (decimal?)null } },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AnUnequalSplitThatAddsUpIsAccepted()
    {
        var (groupId, creator, creatorClient, member, _) = await NewGroupOfTwoAsync();

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "Internet bill",
            amount = 64.99m,
            splitMethod = "unequal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)40.00m, percentage = (decimal?)null },
                             new { username = member.Username, amount = (decimal?)24.99m, percentage = (decimal?)null } },
        });

        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task PercentageSplitsHaveToAddUpTo100()
    {
        var (groupId, creator, creatorClient, member, _) = await NewGroupOfTwoAsync();

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "Rent top-up",
            amount = 150.00m,
            splitMethod = "percentage",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)50m },
                             new { username = member.Username, amount = (decimal?)null, percentage = (decimal?)40m } },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PercentageSplitStillAddsUpToTheExactTotalAfterRounding()
    {
        var (groupId, creator, creatorClient, member, _) = await NewGroupOfTwoAsync();

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "Pizza night",
            amount = 10.00m,
            splitMethod = "percentage",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)50m },
                             new { username = member.Username, amount = (decimal?)null, percentage = (decimal?)50m } },
        });

        var expense = await response.Content.ReadFromJsonAsync<ExpenseResponse>();
        Assert.Equal(10.00m, expense!.Shares.Sum(s => s.Amount));
    }

    [Fact]
    public async Task CantAddAZeroDollarExpense()
    {
        var (groupId, creator, creatorClient, _, _) = await NewGroupOfTwoAsync();

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "Nothing",
            amount = 0m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RejectsASplitMethodThatDoesntExist()
    {
        var (groupId, creator, creatorClient, _, _) = await NewGroupOfTwoAsync();

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "Electricity bill",
            amount = 20m,
            splitMethod = "half-half",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CantSplitAnExpenseWithTheSamePersonTwice()
    {
        var (groupId, creator, creatorClient, _, _) = await NewGroupOfTwoAsync();

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "House groceries",
            amount = 20m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null },
                             new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CantSplitWithSomeoneOutsideTheGroup()
    {
        var (creator, creatorClient) = await NewAuthedClientAsync();
        var group = await (await creatorClient.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();
        var (outsider, _) = await NewAuthedClientAsync();

        var response = await creatorClient.PostAsJsonAsync($"/api/groups/{group!.Id}/expenses", new
        {
            description = "House groceries",
            amount = 20m,
            splitMethod = "equal",
            splits = new[] { new { username = outsider.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task OnlyGroupMembersCanAddAnExpense()
    {
        var (creator, creatorClient) = await NewAuthedClientAsync();
        var group = await (await creatorClient.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();
        var (_, outsiderClient) = await NewAuthedClientAsync();

        var response = await outsiderClient.PostAsJsonAsync($"/api/groups/{group!.Id}/expenses", new
        {
            description = "House groceries",
            amount = 20m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreatorCanEditTheirExpense()
    {
        var (groupId, creator, creatorClient, member, _) = await NewGroupOfTwoAsync();
        var created = await (await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "Weekly groceries",
            amount = 40m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null },
                             new { username = member.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        })).Content.ReadFromJsonAsync<ExpenseResponse>();

        var response = await creatorClient.PatchAsJsonAsync($"/api/groups/{groupId}/expenses/{created!.Id}", new
        {
            description = "Fortnightly groceries",
            amount = 50m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null },
                             new { username = member.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        });

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<ExpenseResponse>();
        Assert.Equal("Fortnightly groceries", updated!.Description);
        Assert.Equal(50m, updated.Shares.Sum(s => s.Amount));
    }

    [Fact]
    public async Task OnlyThePayerCanEditTheExpense()
    {
        var (groupId, creator, creatorClient, member, memberClient) = await NewGroupOfTwoAsync();
        var created = await (await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "Weekly groceries",
            amount = 40m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null },
                             new { username = member.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        })).Content.ReadFromJsonAsync<ExpenseResponse>();

        var response = await memberClient.PatchAsJsonAsync($"/api/groups/{groupId}/expenses/{created!.Id}", new
        {
            description = "Hijacked",
            amount = 999m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreatorCanDeleteTheirExpense()
    {
        var (groupId, creator, creatorClient, member, _) = await NewGroupOfTwoAsync();
        var created = await (await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "Coffee run",
            amount = 10m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null },
                             new { username = member.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        })).Content.ReadFromJsonAsync<ExpenseResponse>();

        var response = await creatorClient.DeleteAsync($"/api/groups/{groupId}/expenses/{created!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var remaining = await creatorClient.GetFromJsonAsync<List<ExpenseResponse>>($"/api/groups/{groupId}/expenses");
        Assert.Empty(remaining!);
    }

    [Fact]
    public async Task OnlyThePayerCanDeleteTheExpense()
    {
        var (groupId, creator, creatorClient, member, memberClient) = await NewGroupOfTwoAsync();
        var created = await (await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description = "Coffee run",
            amount = 10m,
            splitMethod = "equal",
            splits = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null },
                             new { username = member.Username, amount = (decimal?)null, percentage = (decimal?)null } },
        })).Content.ReadFromJsonAsync<ExpenseResponse>();

        var response = await memberClient.DeleteAsync($"/api/groups/{groupId}/expenses/{created!.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ExpensesListShowsTheNewestOneFirst()
    {
        var (groupId, creator, creatorClient, _, _) = await NewGroupOfTwoAsync();
        var soloSplit = new[] { new { username = creator.Username, amount = (decimal?)null, percentage = (decimal?)null } };
        await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new { description = "Coffee run", amount = 10m, splitMethod = "equal", splits = soloSplit });
        await creatorClient.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new { description = "Pizza night", amount = 20m, splitMethod = "equal", splits = soloSplit });

        var response = await creatorClient.GetAsync($"/api/groups/{groupId}/expenses");

        var expenses = await response.Content.ReadFromJsonAsync<List<ExpenseResponse>>();
        Assert.Equal("Pizza night", expenses![0].Description);
        Assert.Equal("Coffee run", expenses[1].Description);
    }
}
