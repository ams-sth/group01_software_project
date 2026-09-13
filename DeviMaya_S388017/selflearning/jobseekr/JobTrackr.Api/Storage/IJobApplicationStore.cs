namespace JobTrackr.Api.Storage;

using JobTrackr.Api.Models;

public interface IJobApplicationStore
{
    JobApplication Add(JobApplication application);
    JobApplication? FindById(int id);
    IEnumerable<JobApplication> GetAll();
    bool Update(JobApplication updated);
    bool Remove(int id);
    IEnumerable<JobApplication> FilterByStatus(ApplicationStatus status);
    IEnumerable<JobApplication> SearchByCompany(string term);
    IEnumerable<JobApplication> SubmittedAfter(DateOnly date);
    IEnumerable<JobApplication> SortNewestFirst();
    IEnumerable<JobApplication> SortByCompanyAlphabetical();
    bool HasPossibleDuplicate(string companyName, string position);

}