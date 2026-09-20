namespace SecureVault.Console.Models;

public class VaultEntry
{
    public int Id { get; }
    public string Name { get; private set; }
    public string Username { get; private set; }
    public string Password { get; private set; }
    public DateTime CreatedAt { get; }
    public bool IsFavourite { get; set; }


    public VaultEntry(int id, string name, string username, string password)
    {
        Id = id;
        Name = name;
        Username = username;
        Password = password;
        CreatedAt = DateTime.UtcNow;
    }

    public void Rename(string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
            throw new ArgumentException("Name is required.", nameof(newName));

        Name = newName.Trim();
    }
}

