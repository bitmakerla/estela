import React, { Component } from "react";
import { Layout, Row, Col, Menu, Dropdown } from "antd";
import { Link } from "react-router-dom";

import history from "../../history";
import { AuthService } from "../../services";

import { ReactComponent as User } from "../../assets/icons/user.svg";
import { ReactComponent as Notification } from "../../assets/icons/notification.svg";
import { ReactComponent as ArrowDown } from "../../assets/icons/arrowDown.svg";
import { ReactComponent as Dashboard } from "../../assets/icons/dashboard.svg";
import { ReactComponent as Settings } from "../../assets/icons/setting.svg";
import { ReactComponent as Billing } from "../../assets/icons/billing.svg";
import { ReactComponent as Logout } from "../../assets/icons/logout.svg";

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
                    <Col flex={1} className="">
                        <Link to="/" className="text-xl hover:text-estela">
                            estela
                        </Link>
                    </Col>
                    <Col flex={0.1} className="">
                        <Notification
                            width={24}
                            className="hover:bg-button-hover stroke-black hover:stroke-estela rounded"
                        />
                    </Col>
                    <Col className="">
                        <Dropdown
                            overlay={
                                <Menu>
                                    <Menu.Item key="0" className="hover:bg-white">
                                        <div className="flex items-center stroke-black hover:stroke-estela hover:text-estela hover:bg-button-hover rounded">
                                            <Dashboard className="mx-1" width={20} />
                                            <Link to={""} className="hover:text-estela">
                                                Home
                                            </Link>
                                        </div>
                                    </Menu.Item>
                                    <Menu.Item key="1" className="hover:bg-white">
                                        <div className="flex items-center stroke-black hover:stroke-estela hover:text-estela hover:bg-button-hover rounded">
                                            <Settings className="mx-1" width={20} />
                                            <Link to={""} className="hover:text-estela">
                                                Account Settings
                                            </Link>
                                        </div>
                                    </Menu.Item>
                                    <Menu.Item key="2" className="hover:bg-white">
                                        <div className="flex items-center stroke-black hover:stroke-estela hover:text-estela hover:bg-button-hover rounded">
                                            <Billing className="mx-1" width={20} />
                                            <Link to={""} className="hover:text-estela">
                                                Billing
                                            </Link>
                                        </div>
                                    </Menu.Item>
                                    <Menu.Item key="3" className="hover:bg-white">
                                        <div className="flex items-center stroke-black hover:stroke-estela hover:text-estela hover:bg-button-hover rounded">
                                            <Logout className="mx-1" width={20} />
                                            <Link to={""} className="hover:text-estela" onClick={this.logout}>
                                                Logout
                                            </Link>
                                        </div>
                                    </Menu.Item>
                                </Menu>
                            }
                            trigger={["click"]}
                        >
                            <a className="flex items-center hover:bg-button-hover rounded">
                                <User className="stroke-estela" width={24.5} />
                                <div className="mx-2 text-sm font-medium text-estela">{this.getUser()}</div>
                                <ArrowDown width={15} className="stroke-estela" />
                            </a>
                        </Dropdown>
                    </Col>
                </Row>
            </Header>
        );
    }
}
