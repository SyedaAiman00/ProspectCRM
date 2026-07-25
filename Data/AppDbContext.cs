using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ProspectCRM.Models;

namespace ProspectCRM.Data;

/// <summary>
/// IdentityDbContext gives us AspNetUsers / AspNetRoles / AspNetUserRoles etc.
/// automatically, on top of our own Prospects/Clients tables.
/// User = our custom user, IdentityRole<int> = plain Identity roles (Agent/Admin),
/// int = the primary key type for both.
/// </summary>
public class AppDbContext : IdentityDbContext<User, IdentityRole<int>, int>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Prospect> Prospects { get; set; }
    public DbSet<Client> Clients { get; set; }

    public DbSet<DropdownOption> DropdownOptions { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder); // required — sets up Identity's own tables first

        // Keep the users table name lowercase/matching your existing MySQL convention
        // instead of Identity's default "AspNetUsers".
        builder.Entity<User>().ToTable("users");
        builder.Entity<IdentityRole<int>>().ToTable("roles");
        builder.Entity<IdentityUserRole<int>>().ToTable("user_roles");
        builder.Entity<IdentityUserClaim<int>>().ToTable("user_claims");
        builder.Entity<IdentityUserLogin<int>>().ToTable("user_logins");
        builder.Entity<IdentityUserToken<int>>().ToTable("user_tokens");
        builder.Entity<IdentityRoleClaim<int>>().ToTable("role_claims");
    }
}