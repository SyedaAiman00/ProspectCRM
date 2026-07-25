using Microsoft.AspNetCore.Identity;

namespace ProspectCRM.Models;

/// <summary>
/// Our application user, built on top of ASP.NET Core Identity.
/// Identity itself supplies Id, Email, PasswordHash, etc. — we only
/// add the fields specific to ProspectCRM here.
/// </summary>
public class User : IdentityUser<int>
{
    public string Name { get; set; } = string.Empty;

    public int MonthlyTarget { get; set; } = 5;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}