namespace ProspectCRM.Models;

/// <summary>Category key constants for DropdownOption.Category — one per card on the Global Dropdowns page.</summary>
public static class DropdownCategories
{
    public const string InsuranceCompany = "insurance_company";
    public const string Product = "product";
    public const string PaymentMode = "payment_mode";
    public const string MobilePrefix = "mobile_prefix";
    public const string YesNo = "yes_no";

    /// <summary>Display labels for the frontend cards, keyed by the same category strings.</summary>
    public static readonly Dictionary<string, string> DisplayNames = new()
    {
        [InsuranceCompany] = "Insurance Company",
        [Product] = "Product",
        [PaymentMode] = "Payment Mode",
        [MobilePrefix] = "Mobile Prefix",
        [YesNo] = "Yes/No Answers",
    };
}