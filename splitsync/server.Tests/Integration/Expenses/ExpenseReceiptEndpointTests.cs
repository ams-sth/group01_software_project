using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using SplitSync.Api.Dtos;

namespace SplitSync.Api.Tests.Integration.Expenses;

public class ExpenseReceiptEndpointTests : IDisposable
{
    private static readonly byte[] TinyJpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0xFF, 0xD9];

    private readonly CustomWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private async Task<(AuthResponse User, HttpClient Client)> NewAuthedClientAsync()
    {
        var client = _factory.CreateClient();
        var user = await TestUsers.RegisterAsync(client);
        TestUsers.AuthorizeAs(client, user);
        return (user, client);
    }

    // Creator pays for a groceries expense split with one other member.
    private async Task<(Guid GroupId, Guid ExpenseId, HttpClient PayerClient, HttpClient MemberClient)> NewExpenseAsync()
    {
        var (payer, payerClient) = await NewAuthedClientAsync();
        var group = await (await payerClient.PostAsJsonAsync("/api/groups", new { name = "Flat 4B" })).Content.ReadFromJsonAsync<GroupResponse>();
        var (member, memberClient) = await NewAuthedClientAsync();
        await payerClient.PostAsJsonAsync($"/api/groups/{group!.Id}/members", new { username = member.Username });

        var expense = await (await payerClient.PostAsJsonAsync($"/api/groups/{group.Id}/expenses", new
        {
            description = "Weekly groceries",
            amount = 84.20m,
            splitMethod = "equal",
            splits = new[] { new { username = payer.Username }, new { username = member.Username } },
        })).Content.ReadFromJsonAsync<ExpenseResponse>();

        return (group.Id, expense!.Id, payerClient, memberClient);
    }

    private static Task<HttpResponseMessage> UploadAsync(HttpClient client, Guid groupId, Guid expenseId, byte[] bytes, string contentType = "image/jpeg")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        var form = new MultipartFormDataContent { { file, "file", "receipt.jpg" } };
        return client.PutAsync($"/api/groups/{groupId}/expenses/{expenseId}/receipt", form);
    }

    [Fact]
    public async Task ThePayerCanAttachAReceiptThatTheRestOfTheGroupCanSee()
    {
        var (groupId, expenseId, payerClient, memberClient) = await NewExpenseAsync();

        var upload = await UploadAsync(payerClient, groupId, expenseId, TinyJpeg);
        upload.EnsureSuccessStatusCode();
        Assert.True((await upload.Content.ReadFromJsonAsync<ExpenseResponse>())!.HasReceipt);

        var listed = await memberClient.GetFromJsonAsync<List<ExpenseResponse>>($"/api/groups/{groupId}/expenses");
        Assert.True(listed!.Single().HasReceipt);

        var download = await memberClient.GetAsync($"/api/groups/{groupId}/expenses/{expenseId}/receipt");
        download.EnsureSuccessStatusCode();
        Assert.Equal("image/jpeg", download.Content.Headers.ContentType!.MediaType);
        Assert.Equal(TinyJpeg, await download.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task AFileThatIsntReallyAnImageIsRejectedEvenIfItClaimsToBeOne()
    {
        var (groupId, expenseId, payerClient, _) = await NewExpenseAsync();

        var response = await UploadAsync(payerClient, groupId, expenseId, "<script>alert(1)</script>"u8.ToArray(), "image/jpeg");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ReceiptsOver5MbAreRejected()
    {
        var (groupId, expenseId, payerClient, _) = await NewExpenseAsync();
        var tooBig = new byte[5 * 1024 * 1024 + 1];
        TinyJpeg.CopyTo(tooBig, 0);

        var response = await UploadAsync(payerClient, groupId, expenseId, tooBig);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task OnlyThePayerCanAttachAReceipt()
    {
        var (groupId, expenseId, _, memberClient) = await NewExpenseAsync();

        var response = await UploadAsync(memberClient, groupId, expenseId, TinyJpeg);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SomeoneOutsideTheGroupCantViewTheReceipt()
    {
        var (groupId, expenseId, payerClient, _) = await NewExpenseAsync();
        await UploadAsync(payerClient, groupId, expenseId, TinyJpeg);
        var (_, outsiderClient) = await NewAuthedClientAsync();

        var response = await outsiderClient.GetAsync($"/api/groups/{groupId}/expenses/{expenseId}/receipt");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RemovingAReceiptMakesItGoAway()
    {
        var (groupId, expenseId, payerClient, memberClient) = await NewExpenseAsync();
        await UploadAsync(payerClient, groupId, expenseId, TinyJpeg);

        var removed = await payerClient.DeleteAsync($"/api/groups/{groupId}/expenses/{expenseId}/receipt");
        removed.EnsureSuccessStatusCode();
        Assert.False((await removed.Content.ReadFromJsonAsync<ExpenseResponse>())!.HasReceipt);

        var download = await memberClient.GetAsync($"/api/groups/{groupId}/expenses/{expenseId}/receipt");
        Assert.Equal(HttpStatusCode.NotFound, download.StatusCode);
    }
}
