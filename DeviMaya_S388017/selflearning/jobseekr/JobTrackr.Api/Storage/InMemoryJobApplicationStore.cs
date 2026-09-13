namespace JobTrackr.Api.Storage;

using JobTrackr.Api.Models;

public class InMemoryJobApplicationStore : IJobApplicationStore
{
    private readonly List<JobApplication> _applications = new();
    private int _nextId = 1;

    public JobApplication Add(JobApplication application)
    {
        application.Id = _nextId++;
        _applications.Add(application);
        return application;
    }

    public JobApplication? FindById(int id) =>
        _applications.FirstOrDefault(a => a.Id == id);

    public IEnumerable<JobApplication> GetAll() => _applications;

    public bool Update(JobApplication updated)
    {
        var index = _applications.FindIndex(a => a.Id == updated.Id);
        if (index == -1) return false;
        _applications[index] = updated;
        return true;
    }

    public bool Remove(int id)
    {
        var app = FindById(id);
        if (app is null) return false;
        _applications.Remove(app);
        return true;
    }

    public IEnumerable<JobApplication> FilterByStatus(ApplicationStatus status)
    {
        return _applications.Where(a => a.Status == status);
    }

    public IEnumerable<JobApplication> SearchByCompany(string term)
    {
        return _applications.Where(a =>
            a.CompanyName.Contains(term, StringComparison.OrdinalIgnoreCase));
    }

    public IEnumerable<JobApplication> SubmittedAfter(DateOnly date)
    {
        return _applications.Where(a => a.ApplicationDate is not null && a.ApplicationDate > date);
    }

    public IEnumerable<JobApplication> SortNewestFirst()
    {
        return _applications.OrderByDescending(a => a.CreatedAt);
    }

    public IEnumerable<JobApplication> SortByCompanyAlphabetical()
    {
        return _applications.OrderBy(a => a.CompanyName, StringComparer.OrdinalIgnoreCase);
    }

    public bool HasPossibleDuplicate(string companyName, string position)
    {
        return _applications.Any(a =>
            a.CompanyName.Equals(companyName, StringComparison.OrdinalIgnoreCase) &&
            a.Position.Equals(position, StringComparison.OrdinalIgnoreCase));
    }
    
}