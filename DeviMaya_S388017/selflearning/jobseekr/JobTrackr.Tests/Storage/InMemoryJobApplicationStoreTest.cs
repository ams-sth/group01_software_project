using JobTrackr.Api.Models;
using JobTrackr.Api.Storage;
using Xunit;

namespace JobTrackr.Tests.Storage;

public class InMemoryJobApplicationStoreTests
{
    private static JobApplication MakeApp(string company, string position, ApplicationStatus status = ApplicationStatus.Draft)
    {
        return new JobApplication
        {
            CompanyName = company,
            Position = position,
            Status = status,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    [Theory]
    [InlineData("Microsoft")]
    [InlineData("microsoft")]
    [InlineData("MICROSOFT")]
    [InlineData("Micro")]
    [InlineData("soft")]
    public void SearchByCompany_IsCaseInsensitiveSubstringMatch(string searchTerm)
    {
        var store = new InMemoryJobApplicationStore();
        store.Add(MakeApp("Microsoft", "Engineer"));

        var results = store.SearchByCompany(searchTerm);

        Assert.Single(results); // exactly one match, regardless of casing/partial term
    }

    [Fact]
    public void SearchByCompany_WithNoMatches_ReturnsEmpty()
    {
        var store = new InMemoryJobApplicationStore();
        store.Add(MakeApp("Microsoft", "Engineer"));

        var results = store.SearchByCompany("Google");

        Assert.Empty(results);
    }

    [Fact]
    public void FilterByStatus_ReturnsOnlyMatchingStatus()
    {
        var store = new InMemoryJobApplicationStore();
        store.Add(MakeApp("Acme", "Engineer", ApplicationStatus.Draft));
        store.Add(MakeApp("Globex", "Engineer", ApplicationStatus.Applied));
        store.Add(MakeApp("Initech", "Engineer", ApplicationStatus.Applied));

        var results = store.FilterByStatus(ApplicationStatus.Applied);

        Assert.Equal(2, results.Count());
        Assert.All(results, a => Assert.Equal(ApplicationStatus.Applied, a.Status));
    }

    [Fact]
    public void SortNewestFirst_OrdersByCreatedAtDescending()
    {
        var store = new InMemoryJobApplicationStore();
        var older = store.Add(MakeApp("Acme", "Engineer"));
        var newer = store.Add(MakeApp("Globex", "Engineer"));

        var results = store.SortNewestFirst().ToList();

        Assert.Equal(newer.Id, results.First().Id);
        Assert.Equal(older.Id, results.Last().Id);
    }
}