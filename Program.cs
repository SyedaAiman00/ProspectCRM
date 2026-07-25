using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ProspectCRM.Data;
using ProspectCRM.Endpoints;
using ProspectCRM.Models;
using ProspectCRM.Services;

var builder = WebApplication.CreateBuilder(args);

// --- Database ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// --- Identity (users, roles, password hashing) ---
builder.Services.AddIdentityCore<User>(options =>
    {
        // Reasonable defaults — tighten later if you want (e.g. RequireDigit, RequireUppercase)
        options.Password.RequiredLength = 8;
        options.User.RequireUniqueEmail = true;

        // Lock an account out after repeated failed login attempts, instead of
        // allowing unlimited password guesses against a known email.
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.AllowedForNewUsers = true;
    })
    .AddRoles<IdentityRole<int>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager();

// --- JWT Authentication ---
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"]!;

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],

            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],

            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            ),

            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1), // don't allow much slack on expiry
        };
    });

// --- Authorization policies ---
// "AdminOnly" for admin-monitoring endpoints (Step 5).
// Agents and Admins alike can hit regular endpoints once [Authorize] is added (Step 6).
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole(Roles.Admin));
});

// --- App services ---
builder.Services.AddScoped<TokenService>();

// --- Swagger ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Swagger is a developer tool that exposes your full API schema —
// only ever enable it in Development, never in Production.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Force HTTPS in any environment that isn't local Development, so auth
// tokens and form data are never sent over plain HTTP once this is hosted.
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}
app.UseHttpsRedirection();

// Seed the Agent/Admin roles on startup if they don't already exist.
using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider
        .GetRequiredService<RoleManager<IdentityRole<int>>>();

    foreach (var roleName in new[] { Roles.Agent, Roles.Admin })
    {
        if (!await roleManager.RoleExistsAsync(roleName))
        {
            await roleManager.CreateAsync(
                new IdentityRole<int>(roleName)
            );
        }
    }
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await ProspectCRM.Data.DropdownSeeder.SeedAsync(db);
}

// Authorize .NET to open and read files out of the wwwroot folder.
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// ==========================================
// --- ROUTES ---
// Each entity's endpoints live in Endpoints/<Entity>Endpoints.cs.
// Adding a new entity's API surface means creating one new file there
// and adding one line here — Program.cs itself should not need to grow.
// ==========================================
app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapProspectEndpoints();
app.MapClientEndpoints();
app.MapDropdownEndpoints();
// Tells .NET to yield root routing priorities directly to your index.html canvas.
app.MapFallbackToFile("index.html");

app.Run();