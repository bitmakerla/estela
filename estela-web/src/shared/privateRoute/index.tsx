import React, { useEffect, useContext } from "react";
import { UserContext } from "../../context";
import { ApiService, AuthService, UserProfile } from "../../services";
import { Redirect, Route } from "react-router-dom";
import { authNotification, invalidDataNotification } from "../notifications";

type RouteProps = {
    render?: () => JSX.Element;
    children?: JSX.Element;
    path?: string | string[];
    exact?: boolean;
    sensitive?: boolean;
    strict?: boolean;
};

export const PrivateRoute: React.FC<RouteProps> = (route) => {
    const { username, email, updateUsername, updateEmail, updateAccessToken } = useContext(UserContext);
    const authToken = AuthService.getAuthToken();
    const apiService = ApiService();
    useEffect(() => {
        let localUsername = username;
        if (localUsername === "") {
            localUsername = AuthService.getUserUsername() ?? "";
        }
        apiService.apiAuthProfileRead({ username: localUsername ?? "" }).then(
            (user: UserProfile) => {
                updateUsername(user.username ?? "");
                updateEmail(user.email ?? "");
            },
            async (error) => {
                try {
                    const data = await error.json();
                    invalidDataNotification(data.error);
                } catch (err) {
                    console.error(err);
                }
            },
        );

        updateAccessToken(AuthService.getAuthToken() ?? "");
    }, [username, email]);

    return (
        <Route
            path={route.path}
            exact={route.exact}
            render={() => {
                if (!authToken)
                    return (
                        <>
                            <Redirect to="/login" />
                            {authNotification()}
                        </>
                    );
                return route.children;
            }}
        />
    );
};
