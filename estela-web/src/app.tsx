import React, { Fragment, Component } from "react";
import { Router } from "react-router-dom";
import { MainRoutes } from "./routes";
import { Header } from "./shared";
import { AuthService } from "./services";
import { authNotification } from "./shared";
import history from "./history";

interface AppState {
    loaded: boolean;
}

export class App extends Component<unknown, AppState> {
    state: AppState = {
        loaded: false,
    };
    componentDidMount(): void {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            this.setState({ loaded: true });
        }
    }
    render(): JSX.Element {
        const { loaded } = this.state;
        return (
            <Fragment>
                <Router history={history}>
                    {loaded ? <Header /> : <Fragment></Fragment>}
                    <MainRoutes />
                </Router>
            </Fragment>
        );
    }
}
