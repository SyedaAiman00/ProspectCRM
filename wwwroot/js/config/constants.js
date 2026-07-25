

// Google Identity Services Client ID — same value as appsettings.json's Google:ClientId.
// Safe to expose publicly; this is not the client secret.
export const GOOGLE_CLIENT_ID = '564981332539-ag9pk0nn59n37h8339rdovtbled6k3rt.apps.googleusercontent.com';



// Category keys + display labels for the Global Dropdowns page — mirrors
// ProspectCRM.Models.DropdownCategories on the backend. Order here is the
// order the 5 cards render in.
export const DROPDOWN_CATEGORIES = [
    { key: 'insurance_company', label: 'Insurance Company' },
    { key: 'product', label: 'Product' },
    { key: 'payment_mode', label: 'Payment Mode' },
    { key: 'mobile_prefix', label: 'Mobile Prefix' },
    { key: 'yes_no', label: 'Yes/No Answers' },
];