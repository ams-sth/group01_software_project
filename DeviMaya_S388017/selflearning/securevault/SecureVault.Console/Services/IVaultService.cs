namespace SecureVault.Console.Services;

using SecureVault.Console.Models;


public interface IVaultService
{
    IReadOnlyList<VaultEntry> GetAll();
    VaultEntry? GetById(int id);
    void Add(VaultEntry entry);
    bool Delete(int id);
}