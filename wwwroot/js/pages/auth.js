/**
 * Shared behavior for the Login and Sign Up pages.
 * These pages sit outside the SPA shell (no router.js/app.js involved),
 * so this bootstraps itself directly via a module script tag in the page.
 */

import { GOOGLE_CLIENT_ID } from '../config/constants.js';
import { storeAuthSession, redirectIfAuthenticated } from '../auth/session.js';

const AUTH_BASE_URL = '/api/auth';

document.addEventListener('DOMContentLoaded', () => {
    redirectIfAuthenticated(); // already logged in? skip the form entirely

    if (window.lucide) lucide.createIcons();

    bindPasswordToggles();
    bindAuthForms();

    // Google's script calls this itself once it's fully loaded — more
    // reliable than assuming it's ready by DOMContentLoaded, since the
    // script tag is async and can finish loading at any time relative
    // to this module.
    if (window.google?.accounts?.id) {
        // Already loaded by the time we got here (e.g. fast connection) — just go.
        initGoogleSignIn();
    } else {
        window.onGoogleLibraryLoad = initGoogleSignIn;
    }
});
/**
 * Wires up every password field's show/hide eye icon.
 */
function bindPasswordToggles() {
    document.querySelectorAll('.auth-toggle-password').forEach((icon) => {
        icon.addEventListener('click', () => {
            const input = icon.closest('.auth-input-wrapper')?.querySelector('input');
            if (!input) return;

            const isCurrentlyHidden = input.type === 'password';
            input.type = isCurrentlyHidden ? 'text' : 'password';

            icon.setAttribute(
                'data-lucide',
                isCurrentlyHidden ? 'eye-off' : 'eye'
            );

            if (window.lucide) {
                lucide.createIcons();
            }
        });
    });
}

function bindAuthForms() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignupSubmit);
    }
}

/**
 * Handles login form submission.
 * @param {SubmitEvent} e
 */
async function handleLoginSubmit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
        const response = await fetch(`${AUTH_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        if (!response.ok) {
            throw new Error(
                response.status === 401
                    ? 'Invalid email or password.'
                    : 'Login failed.'
            );
        }

        const auth = await response.json();

        storeAuthSession(auth);

        window.location.href = '/index.html';
    } catch (err) {
        console.error('Login error:', err);

        alert(
            err.message ||
            'Something went wrong signing in. Please try again.'
        );

        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
}

/**
 * Handles sign up form submission.
 * @param {SubmitEvent} e
 */
async function handleSignupSubmit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');

    const firstName = document.getElementById('firstname').value.trim();
    const lastName = document.getElementById('lastname').value.trim();

    const name = `${firstName} ${lastName}`.trim();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!isValidEmailFormat(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
        const response = await fetch(`${AUTH_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                email,
                password,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);

            const message = Array.isArray(errorBody)
                ? errorBody.join(' ')
                : 'Registration failed.';

            throw new Error(
                response.status === 409
                    ? 'An account with this email already exists.'
                    : message
            );
        }

        const auth = await response.json();

        storeAuthSession(auth);

        window.location.href = '/index.html';
    } catch (err) {
        console.error('Signup error:', err);

        alert(
            err.message ||
            'Something went wrong creating your account. Please try again.'
        );

        submitBtn.disabled = false;
        submitBtn.textContent = 'Get Started';
    }
}

/**
 * Sets up Google Identity Services and renders
 * the Google button into whichever container exists.
 */
function initGoogleSignIn() {

    if (!window.google?.accounts?.id) {
        console.error(
            'Google Identity Services script failed to load.'
        );
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
    });

    const loginContainer = document.getElementById('google-login-btn');

    if (loginContainer) {
       google.accounts.id.renderButton(loginContainer, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    width: 400,
});
    }

    const signupContainer = document.getElementById('google-signup-btn');

    if (signupContainer) {
        google.accounts.id.renderButton(signupContainer, {
    theme: 'outline',
    size: 'large',
    text: 'signup_with',
    shape: 'rectangular',
    width: 40,
});
    }
}

/**
 * Fired once Google successfully authenticates the user.
 * Google returns an id_token which is verified by our backend.
 *
 * @param {{credential:string}} response
 */
async function handleGoogleCredentialResponse(response) {
    try {
        const apiResponse = await fetch(`${AUTH_BASE_URL}/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idToken: response.credential,
            }),
        });

        if (!apiResponse.ok) {
            throw new Error('Google sign-in failed.');
        }

        const auth = await apiResponse.json();

        storeAuthSession(auth);

        window.location.href = '/index.html';
    } catch (err) {
        console.error('Google sign-in error:', err);

        alert(
            'Something went wrong signing in with Google. Please try again.'
        );
    }
}

/**
 * Same lenient format check as the backend's EmailValidator — catches
 * obviously malformed input immediately, before a network round-trip.
 * Doesn't and can't catch domain typos like "gmmail.com" — that's a real
 * address, just not the one they meant.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmailFormat(email) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}