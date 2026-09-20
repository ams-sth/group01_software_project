using SecureVault.Console.Models;


var entries = new List<VaultEntry>();

entries.Add(new VaultEntry(1, "Netflix", "abhi@example.com", "secret"));
entries.Add(new VaultEntry(2, "GitHub", "abhi-dev", "secret"));
entries.Add(new VaultEntry(3, "Microsoft", "student@example.com", "secret"));

// Console.WriteLine("All Entries");
// foreach (VaultEntry entry in entries)
//     Console.WriteLine($"{entry.Id} - {entry.Name} - {entry.Username} - {entry.Password} - {entry.CreatedAt}");

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


// bool running = true;

// while (running)
// {
//     Console.WriteLine("Secure Vault");
//     Console.WriteLine("1. Add Entry");
//     Console.WriteLine("2. View Entries");
//     Console.WriteLine("3. Search Entries");
//     Console.WriteLine("4. Delete Entry");
//     Console.WriteLine("5. Exit");

//     Console.Write("Choose: ");
//     string? choose = Console.ReadLine();

//     switch (choose)
//     {
//         case "1":
//             Console.Write("Entry name: ");
//             string? value = Console.ReadLine();
//             if (!string.IsNullOrWhiteSpace(value))
//                 entries.Add(value.Trim());
//             break;
//         case "2":
//             foreach (string entry in entries)
//                 Console.WriteLine(entry);
//             break;
//         case "3":
//             Console.Write("Search: ");
//             string? term = Console.ReadLine();
//             foreach (string entry in entries)
//                 if (entry.Contains(term ?? "", StringComparison.OrdinalIgnoreCase))
//                     Console.WriteLine(entry);
//             break;

//         case "4":
//             Console.Write("Exact name to delete: ");
//             string? remove = Console.ReadLine();
//             entries.Remove(remove ?? "");
//             break;

//         case "5":
//             running = false;
//             break;

//         default:
//             Console.WriteLine("Unknown option.");
//             break;

//     }
// }