using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ProspectCRM.Models;

namespace ProspectCRM.Services;

/// <summary>
/// Builds signed JWTs for authenticated users. Reads signing key/issuer/audience
/// from the "Jwt" section of appsettings.json (see Program.cs for how it's wired up).
/// </summary>
public class TokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    /// <param name="user">The authenticated user</param>
    /// <param name="roles">Roles to embed as claims — a user could hold more than one</param>
    public string GenerateToken(User user, IList<string> roles)
    {
        var jwtSection = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, user.Name),
        };

        // A user could technically hold multiple roles later — add one claim per role.
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var expiryMinutes = double.Parse(jwtSection["ExpiryMinutes"]!);

        var token = new JwtSecurityToken(
            issuer: jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}