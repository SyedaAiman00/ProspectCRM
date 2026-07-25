using System.Security.Claims;
using ProspectCRM.Models;

namespace ProspectCRM.Extensions;

/// <summary>
/// Small helpers for pulling the logged-in user's id and role off the JWT claims —
/// used throughout the endpoint files instead of repeating ClaimTypes lookups everywhere.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal principal)
    {
        var idClaim = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.Parse(idClaim!);
    }

    public static bool IsAdmin(this ClaimsPrincipal principal)
    {
        return principal.IsInRole(Roles.Admin);
    }
}