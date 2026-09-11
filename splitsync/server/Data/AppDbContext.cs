using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SplitSync.Api.Models;

namespace SplitSync.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<ExpenseShare> ExpenseShares => Set<ExpenseShare>();
    public DbSet<Settlement> Settlements => Set<Settlement>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<GroupMember>(entity =>
        {
            entity.HasKey(gm => new { gm.GroupId, gm.UserId });

            entity.HasOne(gm => gm.Group)
                .WithMany(g => g.Members)
                .HasForeignKey(gm => gm.GroupId);

            entity.HasOne(gm => gm.User)
                .WithMany()
                .HasForeignKey(gm => gm.UserId);
        });

        builder.Entity<Group>()
            .HasOne(g => g.Creator)
            .WithMany()
            .HasForeignKey(g => g.CreatorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Expense>(entity =>
        {
            entity.Property(e => e.Amount).HasPrecision(18, 2);

            entity.HasOne(e => e.Group)
                .WithMany()
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            // Cascade (not Restrict) so deleting an account doesn't get stuck on
            // every expense they ever paid for — there's no "delete expense"
            // feature to unblock it otherwise. This does remove the expense
            // (and everyone's shares in it) for the whole group.
            entity.HasOne(e => e.PaidByUser)
                .WithMany()
                .HasForeignKey(e => e.PaidByUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ExpenseShare>(entity =>
        {
            entity.HasKey(s => new { s.ExpenseId, s.UserId });
            entity.Property(s => s.Amount).HasPrecision(18, 2);

            entity.HasOne(s => s.Expense)
                .WithMany(e => e.Shares)
                .HasForeignKey(s => s.ExpenseId)
                .OnDelete(DeleteBehavior.Cascade);

            // Cascade so deleting an account just drops that person's own share
            // row — it doesn't touch the expense or anyone else's share.
            entity.HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Settlement>(entity =>
        {
            entity.Property(s => s.Amount).HasPrecision(18, 2);

            entity.HasOne(s => s.Group)
                .WithMany()
                .HasForeignKey(s => s.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(s => s.FromUser)
                .WithMany()
                .HasForeignKey(s => s.FromUserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(s => s.ToUser)
                .WithMany()
                .HasForeignKey(s => s.ToUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
