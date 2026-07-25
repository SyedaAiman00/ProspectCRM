namespace ProspectCRM.Models;

/// <summary>Role name constants — used for both seeding roles and [Authorize(Roles = ...)] checks.</summary>
public static class Roles
{
    public const string Agent = "Agent";
    public const string Admin = "Admin";
}