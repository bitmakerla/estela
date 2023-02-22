import { createContext } from "react";

export type UserContextProps = {
    username: string;
    token: string;
    role: string;
    updateUsername: (newUsername: string) => void;
    updateToken: (newToken: string) => void;
    updateRole: (newRole: string) => void;
};

export const UserContext = createContext<UserContextProps>({} as UserContextProps);
