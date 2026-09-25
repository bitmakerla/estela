import { API_BASE_URL } from "../constants";
import { AuthService } from "./auth.service";

/*
 * Signing in and out through the identity provider.
 *
 * estela no longer keeps passwords, so there is no form to submit: the browser is handed to
 * the provider, comes back with a one-time code, and this posts that code to the API. What
 * comes back is the same token the old login returned, stored the same way — which is why
 * nothing else in this app had to change.
 *
 * The code exchange happens on the API and not here, so the client secret never reaches the
 * browser. The provider's configuration is read from the API rather than baked into the build,
 * so pointing staging at a different issuer does not need a rebuild.
 */

const STATE_ITEM_NAME = "oidc_state";
const END_SESSION_ITEM_NAME = "oidc_end_session";

type OidcConfig = {
    issuer: string;
    client_id: string;
    redirect_url: string;
    scope: string;
    authorization_endpoint: string;
    end_session_endpoint: string;
};

type TokenResponse = {
    key: string;
    user?: { username?: string; email?: string };
};

let configPromise: Promise<OidcConfig> | null = null;

const fetchConfig = (): Promise<OidcConfig> => {
    if (!configPromise) {
        configPromise = fetch(`${API_BASE_URL}/api/auth/oidc/config`)
            .then(async (response) => {
                if (!response.ok) {
                    configPromise = null;
                    throw new Error(
                        response.status === 503
                            ? "This deployment has no identity provider configured."
                            : "Could not reach the sign-in service.",
                    );
                }
                return (await response.json()) as OidcConfig;
            })
            .catch((error) => {
                configPromise = null;
                throw error;
            });
    }
    return configPromise;
};

const randomState = (): string => {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

export const OidcService = {
    /* Hands the browser to the provider. Nothing after this line runs. */
    async startLogin(): Promise<void> {
        const config = await fetchConfig();

        /* The state ties the callback to the tab that started it. Without it, anyone could
         * hand someone a callback URL carrying their own code and quietly sign that browser
         * into the attacker's account. sessionStorage and not localStorage so it dies with
         * the tab rather than lingering. */
        const state = randomState();
        sessionStorage.setItem(STATE_ITEM_NAME, state);

        /* Remembered now because logging out needs it, and by then the API call that would
         * provide it may be refused for want of a token. */
        localStorage.setItem(END_SESSION_ITEM_NAME, config.end_session_endpoint);

        const query = new URLSearchParams({
            client_id: config.client_id,
            redirect_uri: config.redirect_url,
            response_type: "code",
            scope: config.scope,
            state,
        });
        window.location.assign(`${config.authorization_endpoint}?${query.toString()}`);
    },

    /* Trades the code for the API token and stores it exactly as the old login did. */
    async completeLogin(code: string, state: string): Promise<TokenResponse> {
        const expected = sessionStorage.getItem(STATE_ITEM_NAME);
        sessionStorage.removeItem(STATE_ITEM_NAME);
        if (!expected || expected !== state) {
            throw new Error("The sign-in state did not match. Please start again.");
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/oidc/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
        });

        if (!response.ok) {
            let detail = "The sign-in could not be completed.";
            try {
                const body = await response.json();
                detail = body.detail ?? body.error ?? detail;
            } catch {
                /* An error page rather than JSON: keep the generic message. */
            }
            throw new Error(detail);
        }

        const token = (await response.json()) as TokenResponse;
        AuthService.setAuthToken(token.key);
        if (token.user?.username) AuthService.setUserUsername(token.user.username);
        if (token.user?.email) AuthService.setUserEmail(token.user.email);
        return token;
    },

    /* Ends BOTH sessions, in this order.
     *
     * Clearing only this app's token used to look like a logout and was not one: the provider
     * still recognised the browser, so the next sign-in was a silent redirect straight back in
     * with no prompt. The second half is what actually logs you out. */
    logout(): void {
        const endSession = localStorage.getItem(END_SESSION_ITEM_NAME);

        AuthService.removeAuthToken();
        AuthService.removeUserUsername();
        AuthService.removeUserEmail();
        AuthService.removeUserRole();
        AuthService.removeFramework();
        localStorage.removeItem(END_SESSION_ITEM_NAME);

        if (!endSession) {
            /* No provider endpoint on record — at least do not pretend to be signed in. */
            window.location.assign("/");
            return;
        }

        const query = new URLSearchParams({ post_logout_redirect_uri: `${window.location.origin}/` });
        window.location.assign(`${endSession}?${query.toString()}`);
    },
};
