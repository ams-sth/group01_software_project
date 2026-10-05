using JobTrackr.Api.Models;
using JobTrackr.Api.Services;
using JobTrackr.Api.Services.Exceptions;
using JobTrackr.Api.Storage;
using Xunit;

namespace JobTrackr.Tests;

public class JobApplicationServiceTests
{
    private JobApplicationService CreateService()
    {
        var store = new InMemoryJobApplicationStore();
        var clock = new SystemClock();
        return new JobApplicationService(store, clock);
    }

    [Fact]
    public void CreateDraft_WithValidInput_CreatesApplication()
    {
        var service = CreateService();

        var result = service.CreateDraft("Acme Corp", "Backend Engineer");

        Assert.Equal("Acme Corp", result.CompanyName);
        Assert.Equal("Backend Engineer", result.Position);
        Assert.Equal(ApplicationStatus.Draft, result.Status);
    }

    [Fact]
    public void CreateDraft_WithMissingCompany_ThrowsValidationFailedException()
    {
        var service = CreateService();

        Assert.Throws<ValidationFailedException>(() =>
            service.CreateDraft("", "Backend Engineer"));
    }

    [Fact]
    public void CreateDraft_WithWhitespaceOnlyPosition_ThrowsValidationFailedException()
    {
        var service = CreateService();

        Assert.Throws<ValidationFailedException>(() =>
            service.CreateDraft("Acme Corp", "   "));
    }

    [Fact]
    public void ValidateBusinessRules_WithFutureApplicationDate_ThrowsValidationFailedException()
    {
        var service = CreateService();
        var app = new JobApplication
        {
            CompanyName = "Acme",
            Position = "Engineer",
            ApplicationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5))
        };

        Assert.Throws<ValidationFailedException>(() =>
            service.ValidateBusinessRules(app));
    }

    [Fact]
    public void ValidateBusinessRules_WithMaxSalaryBelowMin_ThrowsValidationFailedException()
    {
        var service = CreateService();
        var app = new JobApplication
        {
            CompanyName = "Acme",
            Position = "Engineer",
            SalaryMin = 100000m,
            SalaryMax = 80000m
        };

        Assert.Throws<ValidationFailedException>(() =>
            service.ValidateBusinessRules(app));
    }

    [Fact]
    public void ValidateBusinessRules_WithSubmittedStatusAndNoApplicationDate_ThrowsValidationFailedException()
    {
        var service = CreateService();
        var app = new JobApplication
        {
            CompanyName = "Acme",
            Position = "Engineer",
            Status = ApplicationStatus.Applied,
            ApplicationDate = null
        };

        Assert.Throws<ValidationFailedException>(() =>
            service.ValidateBusinessRules(app));
    }


    [Theory]
    [InlineData(ApplicationStatus.Draft, ApplicationStatus.Applied)]
    [InlineData(ApplicationStatus.Applied, ApplicationStatus.Screening)]
    [InlineData(ApplicationStatus.Screening, ApplicationStatus.Interview)]
    public void ChangeStatus_WithAllowedTransition_Succeeds(ApplicationStatus from, ApplicationStatus to)
    {
        var service = CreateService();
        var created = service.CreateDraft("Acme", "Engineer");

        if (from == ApplicationStatus.Applied){
            service.ChangeStatus(created.Id, ApplicationStatus.Applied);
        }
        else if (from == ApplicationStatus.Screening){
            service.ChangeStatus(created.Id, ApplicationStatus.Applied);
            service.ChangeStatus(created.Id, ApplicationStatus.Screening);
        }

        
        // force application to 'walk' through the proper path
        // var path = new[] { ApplicationStatus.Draft, ApplicationStatus.Applied, ApplicationStatus.Screening, ApplicationStatus.Interview };
        // foreach (var step in path)
        // {
        //     if (step == from) break; // stop once we've reached the starting state
        //     service.ChangeStatus(created.Id, step);


        // }

        var result = service.ChangeStatus(created.Id, to);

        Assert.Equal(to, result.Status);
    }

    [Theory]
    [InlineData(ApplicationStatus.Rejected, ApplicationStatus.Screening)]
    [InlineData(ApplicationStatus.Withdrawn, ApplicationStatus.Interview)]
    [InlineData(ApplicationStatus.Offer, ApplicationStatus.Draft)]
    public void ChangeStatus_WithForbiddenTransition_ThrowsForbiddenTransitionException(ApplicationStatus from, ApplicationStatus to)
    {
        var service = CreateService();
        var created = service.CreateDraft("Acme", "Engineer");

        // force into the 'from' state directly via the store, bypassing transition rules,
        // since some 'from' states (like Rejected) aren't reachable through normal allowed transitions from Draft.
        created.Status = from;

        Assert.Throws<ForbiddenTransitionException>(() =>
            service.ChangeStatus(created.Id, to));
    }

    [Fact]
    public void ChangeStatus_WithUnknownId_ThrowsApplicationNotFoundException()
    {
        var service = CreateService();

        Assert.Throws<ApplicationNotFoundException>(() =>
            service.ChangeStatus(9999, ApplicationStatus.Applied));
    }

    [Fact]
    public void ChangeStatus_ToSameStatus_ThrowsForbiddenTransitionException()
    {
        var service = CreateService();
        var created = service.CreateDraft("Acme", "Engineer");

        Assert.Throws<ForbiddenTransitionException>(() =>
            service.ChangeStatus(created.Id, ApplicationStatus.Draft));
    }
}