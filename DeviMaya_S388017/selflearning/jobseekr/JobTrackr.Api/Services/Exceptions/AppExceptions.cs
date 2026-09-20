namespace JobTrackr.Api.Services.Exceptions;

public class ValidationFailedException : Exception
{
    public ValidationFailedException(string message) : base(message) { }
}

public class ApplicationNotFoundException : Exception
{
    public ApplicationNotFoundException(int id)
        : base($"No application with id {id}.") { }
}

public class ForbiddenTransitionException : Exception
{
    public ForbiddenTransitionException(string message) : base(message) { }
}

public class DuplicateApplicationException : Exception
{
    public DuplicateApplicationException(string message) : base(message) { }
}