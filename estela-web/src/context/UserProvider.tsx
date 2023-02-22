import React, { Component } from "react";
import { UserContext } from "./UserContext";

interface UserProviderProps {
    children: JSX.Element | JSX.Element[];
}

interface UserProviderState {
    username: string;
    token: string;
    role: string;
}

export class UserProvider extends Component<UserProviderProps, UserProviderState> {
    state: UserProviderState = {
        username: "",
        token: "",
        role: "",
    };

    updateUsername = (newUsername: string) => {
        this.setState({ username: newUsername });
    };
    updateToken = (newToken: string) => {
        this.setState({ token: newToken });
    };
    updateRole = (newRole: string) => {
        this.setState({ role: newRole });
    };

    render(): JSX.Element {
        const { children } = this.props;
        const { username, token, role } = this.state;
        const { updateUsername, updateToken, updateRole } = this;
        return (
            <UserContext.Provider
                value={{
                    username,
                    token,
                    role,
                    updateUsername,
                    updateToken,
                    updateRole,
                }}
            >
                {children}
            </UserContext.Provider>
        );
    }
}
