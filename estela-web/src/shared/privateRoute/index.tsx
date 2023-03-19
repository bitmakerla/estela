import { AuthService } from "../../services";
import React from "react";
import { Redirect, Route } from "react-router-dom";
import { authNotification } from "../notifications";

type RouteProps = {
    render?: () => JSX.Element;
    children?: JSX.Element;
    path?: string | string[];
    exact?: boolean;
    sensitive?: boolean;
    strict?: boolean;
};

export const PrivateRoute: React.FC<RouteProps> = (route) => {
    const authToken = AuthService.getAuthToken();

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
