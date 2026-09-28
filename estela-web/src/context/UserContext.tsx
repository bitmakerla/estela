import { createContext } from "react";

export type UserContextProps = {
    username: string;
    email: string;
    role?: string;
    updateUsername: (newUsername: string) => void;
    updateEmail: (newEmail: string) => void;
    updateRole?: (newRole: string) => void;
};

export const UserContext = createContext<UserContextProps>({} as UserContextProps);
