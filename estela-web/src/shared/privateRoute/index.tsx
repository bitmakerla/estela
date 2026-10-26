import React, { useEffect, useContext } from "react";
import { UserContext } from "../../context";
import { ApiService, AuthService, UserProfile, WhoAmI } from "../../services";
import { signIn } from "../../services/oidc";
import { AUTH_MODE } from "../../constants";
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

const LocalPrivateRoute: React.FC<RouteProps> = (route) => {
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
                if (!authToken) {
                    const next = encodeURIComponent(window.location.pathname + window.location.search);
                    return (
                        <>
                            <Redirect to={`/login?next=${next}`} />
                            {authNotification()}
                        </>
                    );
                }
                return route.children;
            }}
        />
    );
};

/*
 * AUTH_MODE=oidc: every page sits behind the gateway, so if this app loaded at all, the browser
 * had a session. What is left is learning who signed in, and noticing when the session runs out.
 *
 * A 401 from the gateway has no body and means the session is gone: sign in again, back to this
 * page. A 401 from estela carries a reason (an inactive account, say) and is shown instead, since
 * the gateway would let that person straight back in and the page would loop.
 */
const OidcPrivateRoute: React.FC<RouteProps> = (route) => {
    const { updateUsername, updateEmail } = useContext(UserContext);
    useEffect(() => {
        ApiService()
            .apiAuthWhoami()
            .then(
                (user: WhoAmI) => {
                    AuthService.setUserUsername(user.username ?? "");
                    AuthService.setUserEmail(user.email ?? "");
                    updateUsername(user.username ?? "");
                    updateEmail(user.email ?? "");
                },
                async (error: Response) => {
                    const data = await error.json().catch(() => null);
                    if (error.status === 401 && !data) {
                        signIn();
                        return;
                    }
                    invalidDataNotification(data?.detail ?? `Could not load your account (${error.status}).`);
                },
            );
    }, []);

    return <Route path={route.path} exact={route.exact} render={() => route.children} />;
};

export const PrivateRoute = AUTH_MODE === "oidc" ? OidcPrivateRoute : LocalPrivateRoute;
