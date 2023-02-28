import { createContext } from "react";

export type UserContextProps = {
    username: string;
    email: string;
    accessToken: string;
    role?: string;
    updateUsername: (newUsername: string) => void;
    updateAccessToken: (newAccessToken: string) => void;
    updateEmail: (newEmail: string) => void;
    updateRole?: (newRole: string) => void;
};

export const UserContext = createContext<UserContextProps>({} as UserContextProps);
