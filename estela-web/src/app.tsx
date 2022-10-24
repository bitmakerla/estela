import React, { Fragment, Component } from "react";
import { Router } from "react-router-dom";
import { MainRoutes } from "./routes";
import { Header } from "./shared";
import history from "./history";
export class App extends Component<unknown, unknown> {
    render(): JSX.Element {
        return (
            <Fragment>
                <Router history={history}>
                    <Header />
                    <MainRoutes />
                </Router>
            </Fragment>
        );
    }
}