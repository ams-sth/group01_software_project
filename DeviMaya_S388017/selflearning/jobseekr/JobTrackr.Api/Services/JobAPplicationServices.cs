namespace JobTrackr.Api.Services;

using JobTrackr.Api.Models;
using JobTrackr.Api.Storage;

public class JobApplicationService
{
    private readonly IJobApplicationStore _store;
    private readonly IClock _clock;

    public JobApplicationService(IJobApplicationStore store, IClock clock)
    {
        _store = store;
        _clock = clock;

    }

    public bool IsValidTransition(ApplicationStatus from, ApplicationStatus to)
    {
        return (from, to) switch
        {
            (ApplicationStatus.Draft, ApplicationStatus.Applied) => true,
            (ApplicationStatus.Draft, ApplicationStatus.Withdrawn) => true,

            (ApplicationStatus.Applied, ApplicationStatus.Screening) => true,
            (ApplicationStatus.Applied, ApplicationStatus.Rejected) => true,
            (ApplicationStatus.Applied, ApplicationStatus.Withdrawn) => true,

            (ApplicationStatus.Screening, ApplicationStatus.Interview) => true,
            (ApplicationStatus.Screening, ApplicationStatus.Rejected) => true,
            (ApplicationStatus.Screening, ApplicationStatus.Withdrawn) => true,

            (ApplicationStatus.Interview, ApplicationStatus.Offer) => true,
            (ApplicationStatus.Interview, ApplicationStatus.Rejected) => true,
            (ApplicationStatus.Interview, ApplicationStatus.Withdrawn) => true,

            _ => false
        };
    }

    private void ValidateBusinessRules(JobApplication app)
    {
        if (app.ApplicationDate is not null && app.ApplicationDate > DateOnly.FromDateTime(DateTime.UtcNow))
            throw new ArgumentException("Application date cannot be in the future.");

        if (app.SalaryMin is not null && app.SalaryMin < 0)
            throw new ArgumentException("Minimum salary cannot be negative.");

        if (app.SalaryMin is not null && app.SalaryMax is not null && app.SalaryMax < app.SalaryMin)
            throw new ArgumentException("Maximum salary cannot be lower than minimum salary.");

        if (app.Status != ApplicationStatus.Draft && app.ApplicationDate is null)
            throw new ArgumentException("An application date is required once status is past Draft.");
    }

    public bool Delete(int id)
    {
        return _store.Remove(id);
    }


    public JobApplication CreateDraft(string companyName, string position)
    {
        companyName = companyName?.Trim() ?? "";
        position = position?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(companyName))
            throw new ValidationFailedException("Company name is required.");

        if (string.IsNullOrWhiteSpace(position))
            throw new ValidationFailedException("Position is required.");

        var app = new JobApplication
        {
            CompanyName = companyName,
            Position = position,
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        };
        ValidateBusinessRules(app);
        return _store.Add(app);
    }

    public JobApplication ChangeStatus(int id, ApplicationStatus newStatus)
    {
        var app = _store.FindById(id)
            ?? throw new ApplicationNotFoundException(id);

        if (!IsValidTransition(app.Status, newStatus))
            throw new ForbiddenTransitionException($"Cannot move from {app.Status} to {newStatus}.");

        app.Status = newStatus;
        app.UpdatedAt = _clock.UtcNow;
        _store.Update(app);
        return app;
    }
}

