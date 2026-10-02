import { createContext } from "react";

export type UserContextProps = {
    username: string;
    email: string;
    role?: string;
    updateUsername: (newUsername: string) => void;
    updateEmail: (newEmail: string) => void;
    updateRole?: (newRole: string) => void;
    // bitmaker_billing's micro-frontend still reads and sets these. There is no token any more
    // (the gateway's cookie signs requests in), so they stay empty and do nothing.
    accessToken: string;
    updateAccessToken: (newAccessToken: string) => void;
};

export const UserContext = createContext<UserContextProps>({} as UserContextProps);
