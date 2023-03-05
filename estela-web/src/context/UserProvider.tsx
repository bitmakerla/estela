import React, { Component } from "react";
import { UserContext } from "./UserContext";

interface UserProviderProps {
    children: JSX.Element | JSX.Element[];
}

interface UserProviderState {
    username: string;
    email: string;
    accessToken: string;
    role?: string;
}

export class UserProvider extends Component<UserProviderProps, UserProviderState> {
    state: UserProviderState = {
        username: "",
        email: "",
        accessToken: "",
        role: "",
    };

    updateUsername = (newUsername: string) => {
        this.setState({ username: newUsername });
    };

    updateEmail = (newEmail: string) => {
        this.setState({ email: newEmail });
    };

    updateAccessToken = (newAccessToken: string) => {
        this.setState({ accessToken: newAccessToken });
    };

    updateRole = (newRole: string) => {
        this.setState({ role: newRole });
    };

    render(): JSX.Element {
        const { children } = this.props;
        const { username, email, accessToken, role } = this.state;
        const { updateUsername, updateEmail, updateAccessToken, updateRole } = this;
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
                {children}
            </UserContext.Provider>
        );
    }
}
