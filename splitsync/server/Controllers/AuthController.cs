using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSync.Api.Data;
using SplitSync.Api.Dtos;
using SplitSync.Api.Models;
using SplitSync.Api.Services;

namespace SplitSync.Api.Controllers;

// Handles user registration, login, and account management.
// All endpoints are unauthenticated except /me (GET and DELETE), which require a valid JWT.
[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<AppUser> userManager,
    UsernameGenerator usernameGenerator,
    TokenService tokenService,
    AppDbContext db
) : ControllerBase
{
    // POST /api/auth/register
    // Creates a new account. The username is generated automatically from the email —
    // users never choose one themselves. Returns a JWT on success so the client can
    // sign in immediately without a second round trip.
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        // Check for duplicate email before calling Identity, so we can return a
        // friendlier error message instead of Identity's generic constraint text.
        if (await userManager.FindByEmailAsync(request.Email) is not null)
        {
            return Conflict(new { message = "An account with that email already exists." });
        }

        var username = await usernameGenerator.GenerateAsync(request.Email);
        var user = new AppUser { Email = request.Email, UserName = username };

        // Identity hashes the password and enforces the rules configured in Program.cs
        // (min 8 chars; no uppercase/digit/symbol requirement).
        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        var token = tokenService.CreateToken(user);
        return Ok(new AuthResponse(token, user.UserName!, user.Email!));
    }

    // POST /api/auth/login
    // Accepts either email or username as the identifier (detected by the presence of '@').
    // Returns the same JWT shape as Register so the client can treat both responses identically.
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = request.Identifier.Contains('@')
            ? await userManager.FindByEmailAsync(request.Identifier)
            : await userManager.FindByNameAsync(request.Identifier);

        // Deliberately vague error — don't reveal whether the email/username exists.
        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized(new { message = "Incorrect email/username or password." });
        }

        var token = tokenService.CreateToken(user);
        return Ok(new AuthResponse(token, user.UserName!, user.Email!));
    }

    // GET /api/auth/me
    // Returns the signed-in user's id, username and email, read directly from the JWT
    // claims so no database query is needed.
    [Authorize]
    [HttpGet("me")]
    public ActionResult<object> Me()
    {
        return Ok(new
        {
            id = User.FindFirst("sub")?.Value,
            username = User.FindFirst("unique_name")?.Value,
            email = User.FindFirst("email")?.Value,
        });
    }

    // DELETE /api/auth/me
    // Permanently deletes the signed-in user's account. Blocked if the user still
    // owns any groups — they must delete those first so the groups aren't left without
    // a creator. Cascading deletes in the database handle expenses, shares and notifications.
    [Authorize]
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMe()
    {
        var userId = User.FindFirst("sub")!.Value;

        // List owned group names so the error message tells the user exactly what to clean up.
        var ownedGroupNames = await db.Groups
            .Where(g => g.CreatorId == userId)
            .Select(g => g.Name)
            .ToListAsync();

        if (ownedGroupNames.Count > 0)
        {
            return Conflict(new
            {
                message = $"Delete the group(s) you own first: {string.Join(", ", ownedGroupNames)}.",
            });
        }

        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return NotFound();
        }

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        return NoContent();
    }
}
