import React, { Component } from "react";
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
            <Header className="bg-white">
                <Row justify="center" align="middle">
                    <Col flex={1}>
                        <Link to="/">
                            <div className="text-xl ">estela</div>
                        </Link>
                    </Col>
                    {/* <Row justify="center"> */}
                    <Col>
                        <img src="notification.svg" width="26" className="mr-10" alt="" />
                    </Col>
                    <Col className="flex text-[#4D47C3]">
                        <img src="user.svg" width="26" className="mx-2" alt="" />
                        {this.getUser()}
                        <img src="arrowDown.svg" width="20" className="mx-2" alt="" />
                    </Col>
                    {/* <Col className="">
                        <Link className="" to="/">
                            Home
                        </Link>
                    </Col>
                    <Col onClick={this.logout} className="">
                        Log out
                    </Col> */}
                    {/* </Row> */}
                    {/* {this.isLogged() ? (
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
                    )} */}
                </Row>
            </Header>
        );
    }
}
