import React, { Component, Fragment } from "react";
import { Layout, Row, Col } from "antd";
import { Link } from "react-router-dom";

import history from "../../history";
import { AuthService } from "../../services";

import "./styles.scss";

const { Header } = Layout;

export class CustomHeader extends Component<unknown> {
    isLogged = (): boolean => {
        return Boolean(AuthService.getAuthToken());
    };

    getUser = (): string => {
        return String(AuthService.getUserUsername());
    };

    logout = (): void => {
        AuthService.removeAuthToken();
        history.push("/login");
    };

    render(): JSX.Element {
        return (
            <Header className="header">
                <Link to="/">
                    <div className="logo-header">Estela</div>
                </Link>
                <Row justify="end">
                    {this.isLogged() ? (
                        <Fragment>
                            <Col className="header-item">{this.getUser()}</Col>
                            <Col className="header-item">
                                <Link className="header-item" to="/">
                                    Home
                                </Link>
                            </Col>
                            <Col onClick={this.logout} className="header-item">
                                Log out
                            </Col>
                        </Fragment>
                    ) : (
                        <Col>
                            <Link className="header-item" to="/register">
                                Register
                            </Link>
                            <Link className="header-item" to="/login">
                                Login
                            </Link>
                        </Col>
                    )}
                </Row>
            </Header>
        );
    }
}
