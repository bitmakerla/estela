const USERNAME_ITEM_NAME = "user_username";
const USERNAME_ROLE = "user_role";
const USERNAME_EMAIL = "user_email";
const FRAMEWORK = "framework";

export const AuthService = {
    // bitmaker_billing's micro-frontend imports this service and still asks for a token. Signing
    // in now lives in the gateway's cookie, so there is no token to give and no header to add.
    getAuthToken(): string | null {
        return null;
    },
    getDefaultAuthHeaders(): Record<string, never> {
        return {};
    },
    getUserUsername(): string | null {
        return localStorage.getItem(USERNAME_ITEM_NAME);
    },
    removeUserUsername(): void {
        localStorage.removeItem(USERNAME_ITEM_NAME);
    },
    setUserUsername(username: string): void {
        localStorage.setItem(USERNAME_ITEM_NAME, username);
    },
    getUserRole(): string | null {
        return localStorage.getItem(USERNAME_ROLE) ?? "";
    },
    removeUserRole(): void {
        localStorage.removeItem(USERNAME_ROLE);
    },
    setUserRole(role: string): void {
        role = role.toLowerCase();
        localStorage.setItem(USERNAME_ROLE, role);
    },
    getFramework(): string | null {
        return localStorage.getItem(FRAMEWORK) ?? "";
    },
    removeFramework(): void {
        localStorage.removeItem(FRAMEWORK);
    },
    setFramework(framework: string): void {
        localStorage.setItem(FRAMEWORK, framework);
    },
    getUserEmail(): string | null {
        return localStorage.getItem(USERNAME_EMAIL) ?? "";
    },
    removeUserEmail(): void {
        localStorage.removeItem(USERNAME_EMAIL);
    },
    setUserEmail(email: string): void {
        localStorage.setItem(USERNAME_EMAIL, email);
    },
};
