using System.Text.RegularExpressions;

namespace ProspectCRM.Services;

/// <summary>
/// Server-side email format validation. This confirms the string LOOKS like
/// a valid email (has an @ symbol, a domain with a dot, no spaces, etc.) —
/// it does NOT and cannot confirm the domain actually exists or receives
/// mail. A typo like "user@gmmail.com" is syntactically valid and will pass
/// this check; catching that requires a real deliverability check (MX
/// record lookup or a verification email), which is a separate, heavier
/// feature — see the note in AuthEndpoints if that's ever needed.
/// </summary>
public static class EmailValidator
{
    // Practical, widely-used pattern: local-part@domain.tld, no spaces,
    // domain must have at least one dot. Deliberately not attempting full
    // RFC 5322 compliance — that regex is famously enormous and mostly
    // catches edge cases that don't matter for a signup form.
    private static readonly Regex Pattern = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled);

    public static bool IsValidFormat(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        return Pattern.IsMatch(email.Trim());
    }
}