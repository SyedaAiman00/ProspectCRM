using Microsoft.AspNetCore.Identity;
using ProspectCRM.Models;
using ProspectCRM.Services;
using Google.Apis.Auth; 


namespace ProspectCRM.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", async (
            RegisterRequest request,
            UserManager<User> userManager,
            TokenService tokenService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest("Name, email, and password are all required.");
            }

            var normalizedEmail = request.Email.Trim();
            if (!EmailValidator.IsValidFormat(normalizedEmail))
            {
                return Results.BadRequest("Please enter a valid email address.");
            }

            var existing = await userManager.FindByEmailAsync(normalizedEmail);

            if (existing is not null)
            {
                return Results.Conflict("An account with this email already exists.");
            }

           var newUser = new User
            {
                UserName = normalizedEmail, // Identity requires a UserName — email doubles as it here
                Email = normalizedEmail,
                Name = request.Name.Trim(),
            };

            var createResult = await userManager.CreateAsync(newUser, request.Password);
            if (!createResult.Succeeded)
            {
                var errors = createResult.Errors.Select(e => e.Description);
                return Results.BadRequest(errors);
            }

            // Every self-registered account starts as a plain Agent.
            // Admin accounts are promoted manually — see the SQL note at the end of this step.
            await userManager.AddToRoleAsync(newUser, Roles.Agent);

            var token = tokenService.GenerateToken(newUser, new[] { Roles.Agent });

            return Results.Created($"/api/users/{newUser.Id}", new AuthResponse(
                Token: token,
                Id: newUser.Id,
                Name: newUser.Name,
                Email: newUser.Email!,
                Role: Roles.Agent,
                MonthlyTarget: newUser.MonthlyTarget
            ));
        });

        group.MapPost("/login", async (
            LoginRequest request,
            UserManager<User> userManager,
            SignInManager<User> signInManager,
            TokenService tokenService) =>

        {
            var user = await userManager.FindByEmailAsync(request.Email);
            if (user is null)
            {
                return Results.Unauthorized();
            }

            var passwordCheck = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
            if (!passwordCheck.Succeeded)
            {
                return Results.Unauthorized();
            }

            var roles = await userManager.GetRolesAsync(user);
            var token = tokenService.GenerateToken(user, roles);

            return Results.Ok(new AuthResponse(
                Token: token,
                Id: user.Id,
                Name: user.Name,
                Email: user.Email!,
                Role: roles.Contains(Roles.Admin) ? Roles.Admin : Roles.Agent,
                MonthlyTarget: user.MonthlyTarget
            ));
        });
    group.MapPost("/google", async (
            GoogleAuthRequest request,
            UserManager<User> userManager,
            TokenService tokenService,
            IConfiguration config) =>
        {
            GoogleJsonWebSignature.Payload payload;
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { config["Google:ClientId"] },
                };
                payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
            }
            catch (InvalidJwtException)
            {
                // Token failed signature/audience/expiry checks — reject outright.
                return Results.Unauthorized();
            }

            var user = await userManager.FindByEmailAsync(payload.Email);
            if (user is null)
            {
                // First time this Google account has signed in — auto-register as Agent.
                // No password is set; this account can only ever sign in via Google,
                // which is fine since it never needs one.
                user = new User
                {
                    UserName = payload.Email,
                    Email = payload.Email,
                    Name = payload.Name ?? payload.Email,
                    EmailConfirmed = true, // Google already verified this address
                };

                var createResult = await userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    return Results.BadRequest(createResult.Errors.Select(e => e.Description));
                }

                await userManager.AddToRoleAsync(user, Roles.Agent);
            }
            // If a user already registered with this email via password, signing in
            // with Google here just logs them into that same existing account —
            // acceptable since Google has already verified they own the email address.

            var roles = await userManager.GetRolesAsync(user);
            var token = tokenService.GenerateToken(user, roles);

            return Results.Ok(new AuthResponse(
                Token: token,
                Id: user.Id,
                Name: user.Name,
                Email: user.Email!,
                Role: roles.Contains(Roles.Admin) ? Roles.Admin : Roles.Agent,
                MonthlyTarget: user.MonthlyTarget
            ));
        });        
    }

    
}

public record RegisterRequest(string Name, string Email, string Password);

public record LoginRequest(string Email, string Password);

public record GoogleAuthRequest(string IdToken);

/// <summary>
/// What the frontend gets back after register/login — everything auth.js
/// needs to store (token) and everything the UI needs on first paint
/// (name/role) without an extra round-trip to /api/users/{id}.
/// </summary>
public record AuthResponse(string Token, int Id, string Name, string Email, string Role, int MonthlyTarget);