namespace SecureVault.Console.Exceptions;

public sealed class VaultEntryNotFoundException : Exception
{
    public VaultEntryNotFoundException(int id)
        : base($"Vault entry with id {id} was not found.")
    {
    }
}