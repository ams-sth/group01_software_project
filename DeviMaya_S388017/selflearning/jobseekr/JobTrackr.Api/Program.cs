using JobTrackr.Api.Models;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

// temporary code for task 2.5
// var draft = new JobApplication
// {
//     CompanyName = "Acme Corp",
//     Position = "Backend Engineer",
//     Location = "Remote",
//     CreatedAt = DateTimeOffset.UtcNow,
//     UpdatedAt = DateTimeOffset.UtcNow
// };

// app.Run();


var store = new InMemoryJobApplicationStore();
store.Add(new JobApplication { CompanyName = "Acme", Position = "Engineer", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });

var all = store.GetAll();
if (all is List<JobApplication> mutableList)
{
    mutableList.Clear(); // if this compiles and works, the store is exposed
}
Console.WriteLine(store.GetAll().Count()); // should print 1, but will print 0 if vulnerable