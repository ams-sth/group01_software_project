using SecureVault.Console.Models;
using SecureVault.Console.Services;
using SecureVault.Console.Exceptions;


IVaultService _service = new InMemoryVaultService();

var entries = _service.GetAll().ToList();

entries.Add(new VaultEntry(1, "Netflix", "abhi@example.com", "secret"));
entries.Add(new VaultEntry(2, "GitHub", "abhi-dev", "secret"));
entries.Add(new VaultEntry(3, "Microsoft", "student@example.com", "secret"));

var favourites = entries
    .Where(e => e.IsFavourite)
    .OrderBy(e => e.Name)
    .ToList();

var names = entries
    .Select(e => e.Name)
    .ToList();

bool hasGitHub = entries.Any(e => e.Name == "GitHub");

VaultEntry? entry = entries.FirstOrDefault(e => e.Id == 2);

Console.WriteLine($"Found entry: {entry?.Name} - {entry?.Username} - {entry?.Password} - {entry?.CreatedAt}");


var id = 4;
try
{
    VaultEntry newEntry = _service.GetById(id)
        ?? throw new VaultEntryNotFoundException(id);

    Console.WriteLine(newEntry.Name);
}
catch (VaultEntryNotFoundException ex)
{
    Console.WriteLine(ex.Message);
}
catch (Exception ex)
{
    Console.WriteLine("Unexpected failure.");
    Console.WriteLine(ex.Message);
}
finally
{
    Console.WriteLine("Lookup finished.");
}