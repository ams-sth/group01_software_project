namespace JobTrackr.Api.Models;

public class JobApplication
{
    public int Id { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public string CompanyName { get; set; } = default!;
    public string Position { get; set; } = default!;
    public string? Location { get; set; }
    public string? JobUrl { get; set; }
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Draft;
    public DateOnly? ApplicationDate { get; set; }
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
