using System.Net;
using System.Net.Http.Json;
using SplitSync.Api.Dtos;

namespace SplitSync.Api.Tests.Integration.Notifications;

public class NotificationsEndpointTests : IDisposable
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

    private async Task<(Guid GroupId, AuthResponse Payer, HttpClient PayerClient, AuthResponse Member, HttpClient MemberClient)> NewGroupOfTwoAsync()
    {
        var (payer, payerClient) = await NewAuthedClientAsync();
        var group = await (await payerClient.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();
        var (member, memberClient) = await NewAuthedClientAsync();
        await payerClient.PostAsJsonAsync($"/api/groups/{group!.Id}/members", new { username = member.Username });
        return (group.Id, payer, payerClient, member, memberClient);
    }

    private static Task<HttpResponseMessage> AddExpenseAsync(HttpClient client, Guid groupId, string description, decimal amount, params string[] splitUsernames)
    {
        return client.PostAsJsonAsync($"/api/groups/{groupId}/expenses", new
        {
            description,
            amount,
            splitMethod = "equal",
            splits = splitUsernames.Select(u => new { username = u, amount = (decimal?)null, percentage = (decimal?)null }).ToArray(),
        });
    }

    [Fact]
    public async Task AddingAnExpenseNotifiesTheOtherFlatmate()
    {
        var (groupId, payer, payerClient, member, memberClient) = await NewGroupOfTwoAsync();

        await AddExpenseAsync(payerClient, groupId, "Weekly groceries", 40m, payer.Username, member.Username);

        var notifications = await memberClient.GetFromJsonAsync<List<NotificationResponse>>("/api/notifications");
        var notification = Assert.Single(notifications!, n => n.Message.Contains("Weekly groceries"));
        Assert.False(notification.IsRead);
    }

    [Fact]
    public async Task ThePayerDoesntGetNotifiedAboutTheirOwnExpense()
    {
        var (groupId, payer, payerClient, member, _) = await NewGroupOfTwoAsync();

        await AddExpenseAsync(payerClient, groupId, "Weekly groceries", 40m, payer.Username, member.Username);

        var notifications = await payerClient.GetFromJsonAsync<List<NotificationResponse>>("/api/notifications");
        Assert.Empty(notifications!);
    }

    [Fact]
    public async Task UnreadCountGoesUpWhenAnExpenseIsAdded()
    {
        var (groupId, payer, payerClient, member, memberClient) = await NewGroupOfTwoAsync();
        var before = await memberClient.GetFromJsonAsync<UnreadCountResponse>("/api/notifications/unread-count");

        await AddExpenseAsync(payerClient, groupId, "Weekly groceries", 40m, payer.Username, member.Username);

        var after = await memberClient.GetFromJsonAsync<UnreadCountResponse>("/api/notifications/unread-count");
        Assert.Equal(before!.Count + 1, after!.Count);
    }

    [Fact]
    public async Task MarkingANotificationReadUpdatesItAndTheUnreadCount()
    {
        var (groupId, payer, payerClient, member, memberClient) = await NewGroupOfTwoAsync();
        await AddExpenseAsync(payerClient, groupId, "Weekly groceries", 40m, payer.Username, member.Username);
        var before = await memberClient.GetFromJsonAsync<UnreadCountResponse>("/api/notifications/unread-count");
        var notifications = await memberClient.GetFromJsonAsync<List<NotificationResponse>>("/api/notifications");
        var notification = notifications!.Single(n => n.Message.Contains("Weekly groceries"));

        var markRead = await memberClient.PostAsync($"/api/notifications/{notification.Id}/read", null);
        markRead.EnsureSuccessStatusCode();

        var updated = (await memberClient.GetFromJsonAsync<List<NotificationResponse>>("/api/notifications"))!.Single(n => n.Id == notification.Id);
        Assert.True(updated.IsRead);
        var after = await memberClient.GetFromJsonAsync<UnreadCountResponse>("/api/notifications/unread-count");
        Assert.Equal(before!.Count - 1, after!.Count);
    }

    [Fact]
    public async Task MarkAllReadClearsEveryUnreadNotification()
    {
        var (groupId, payer, payerClient, member, memberClient) = await NewGroupOfTwoAsync();
        await AddExpenseAsync(payerClient, groupId, "Weekly groceries", 40m, payer.Username, member.Username);
        await AddExpenseAsync(payerClient, groupId, "Pizza night", 20m, payer.Username, member.Username);

        var markAllRead = await memberClient.PostAsync("/api/notifications/read-all", null);
        markAllRead.EnsureSuccessStatusCode();

        var unread = await memberClient.GetFromJsonAsync<UnreadCountResponse>("/api/notifications/unread-count");
        Assert.Equal(0, unread!.Count);
    }

    [Fact]
    public async Task YouCantMarkSomeoneElsesNotificationAsRead()
    {
        var (groupId, payer, payerClient, member, memberClient) = await NewGroupOfTwoAsync();
        await AddExpenseAsync(payerClient, groupId, "Weekly groceries", 40m, payer.Username, member.Username);
        var notifications = await memberClient.GetFromJsonAsync<List<NotificationResponse>>("/api/notifications");
        var notification = notifications!.Single(n => n.Message.Contains("Weekly groceries"));

        var response = await payerClient.PostAsync($"/api/notifications/{notification.Id}/read", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
