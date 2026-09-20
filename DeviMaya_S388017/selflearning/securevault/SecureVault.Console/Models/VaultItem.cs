namespace SecureVault.Console.Models;


public abstract class VaultItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class PasswordEntry : VaultItem
{
    public string Username { get; set; } = string.Empty;
    public string Secret { get; set; } = string.Empty;
}

public sealed class SecureNote : VaultItem
{
    public string Content { get; set; } = string.Empty;
}
