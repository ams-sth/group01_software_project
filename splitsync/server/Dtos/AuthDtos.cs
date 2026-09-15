namespace SplitSync.Api.Dtos;

public record RegisterRequest(string Email, string Password);

public record LoginRequest(string Identifier, string Password);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record AuthResponse(string Token, string Username, string Email);
