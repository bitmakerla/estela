import React, { useState } from "react";
import { UserContext } from "./UserContext";

interface UserProviderProps {
    children: JSX.Element | JSX.Element[];
}

export const UserProvider: React.FC<UserProviderProps> = (props) => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [accessToken, setAccessToken] = useState("");
    const [role, setRole] = useState("");

    const updateUsername = (newUsername: string) => {
        setUsername(newUsername);
    };

    const updateEmail = (newEmail: string) => {
        setEmail(newEmail);
    };

    const updateAccessToken = (newAccessToken: string) => {
        setAccessToken(newAccessToken);
    };

    const updateRole = (newRole: string) => {
        setRole(newRole);
    };

    return (
        <UserContext.Provider
            value={{
                username,
                email,
                accessToken,
                role,
                updateUsername,
                updateEmail,
                updateAccessToken,
                updateRole,
            }}
        >
            {props.children}
        </UserContext.Provider>
    );
};
