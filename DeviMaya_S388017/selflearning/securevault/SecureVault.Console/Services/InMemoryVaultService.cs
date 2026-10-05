namespace SecureVault.Console.Services;
using SecureVault.Console.Models;


public sealed class InMemoryVaultService : IVaultService
{
    private readonly List<VaultEntry> _entries = new();

    public IReadOnlyList<VaultEntry> GetAll() => _entries;
    public VaultEntry? GetById(int id) => _entries.FirstOrDefault(e => e.Id == id);
    public void Add(VaultEntry entry) => _entries.Add(entry);
    public bool Delete(int id)
    {
        VaultEntry? entry = GetById(id);
        return entry is not null && _entries.Remove(entry);
    }
}