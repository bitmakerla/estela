const TOKEN_ITEM_NAME = "authToken";
const USERNAME_ITEM_NAME = "user_username";
const USERNAME_ROLE = "user_role";
const USERNAME_EMAIL = "user_email";

export const AuthService = {
    getAuthToken(): string | null {
        return localStorage.getItem(TOKEN_ITEM_NAME);
    },
    removeAuthToken(): void {
        localStorage.removeItem(TOKEN_ITEM_NAME);
    },
    setAuthToken(token: string): void {
        localStorage.setItem(TOKEN_ITEM_NAME, token);
    },
    getDefaultAuthHeaders(): { Authorization: string } | Record<string, never> {
        const token = this.getAuthToken();
        if (!token) {
            return {};
        }
        return { Authorization: `Token ${token}` };
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
        localStorage.setItem(USERNAME_ROLE, role);
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
