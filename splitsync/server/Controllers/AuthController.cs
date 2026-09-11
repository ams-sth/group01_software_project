using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSync.Api.Data;
using SplitSync.Api.Dtos;
using SplitSync.Api.Models;
using SplitSync.Api.Services;

namespace SplitSync.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<AppUser> userManager,
    UsernameGenerator usernameGenerator,
    TokenService tokenService,
    AppDbContext db
) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (await userManager.FindByEmailAsync(request.Email) is not null)
        {
            return Conflict(new { message = "An account with that email already exists." });
        }

        var username = await usernameGenerator.GenerateAsync(request.Email);
        var user = new AppUser { Email = request.Email, UserName = username };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        var token = tokenService.CreateToken(user);
        return Ok(new AuthResponse(token, user.UserName!, user.Email!));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = request.Identifier.Contains('@')
            ? await userManager.FindByEmailAsync(request.Identifier)
            : await userManager.FindByNameAsync(request.Identifier);

        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized(new { message = "Incorrect email/username or password." });
        }

        var token = tokenService.CreateToken(user);
        return Ok(new AuthResponse(token, user.UserName!, user.Email!));
    }

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

    [Authorize]
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMe()
    {
        var userId = User.FindFirst("sub")!.Value;

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
