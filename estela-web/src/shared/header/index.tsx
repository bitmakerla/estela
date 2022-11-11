import React, { Component } from "react";
import { Layout, Row, Col, Menu, Dropdown } from "antd";
import { Link } from "react-router-dom";

import history from "../../history";
import { AuthService } from "../../services";
import { NotificationsList } from "../../shared";
import { ExternalDropdownComponent } from "../../externalComponets";

import User from "../../assets/icons/user.svg";
import Notification from "../../assets/icons/notification.svg";
import ArrowDown from "../../assets/icons/arrowDown.svg";
import Dashboard from "../../assets/icons/dashboard.svg";
import Settings from "../../assets/icons/setting.svg";
import Logout from "../../assets/icons/logout.svg";
const { Header, Content } = Layout;

interface HeaderInterface {
    path?: string;
}

export class CustomHeader extends Component<HeaderInterface, unknown> {
    path = this.props.path;
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
                    <Col flex={0.06} className="">
                        <Dropdown
                            overlay={
                                <Content className=" bg-white rounded-2xl p-3 w-96">
                                    <NotificationsList />
                                    <Link
                                        className="text-estela font-semibold flex justify-center"
                                        to={"/notifications/inbox"}
                                    >
                                        See all
                                    </Link>
                                </Content>
                            }
                            trigger={["click"]}
                        >
                            {this.path === "/notifications/inbox" ? (
                                <a className="flex justify-center items-center border border-estela stroke-estela rounded-lg bg-estela-blue-low w-10 p-2">
                                    <Notification className="w-6 h-6" />
                                </a>
                            ) : (
                                <a className="flex justify-center items-center hover:stroke-estela stroke-black hover:bg-button-hover rounded-lg w-10 p-2">
                                    <Notification className="w-6 h-6" />
                                </a>
                            )}
                        </Dropdown>
                    </Col>
                    <Col>
                        <Dropdown
                            overlay={
                                <Menu>
                                    <Menu.Item key="0" className="hover:bg-white">
                                        <div className="flex items-center stroke-black hover:stroke-estela hover:text-estela hover:bg-button-hover rounded">
                                            <Dashboard className="mx-1 w-6 h-6" />
                                            <Link to={""} className="hover:text-estela">
                                                Home
                                            </Link>
                                        </div>
                                    </Menu.Item>
                                    <Menu.Item key="1" className="hover:bg-white">
                                        <div className="flex items-center stroke-black hover:stroke-estela hover:text-estela hover:bg-button-hover rounded">
                                            <Settings className="mx-1 w-6 h-6" />
                                            <Link to={"/settings/profile"} className="hover:text-estela">
                                                Account Settings
                                            </Link>
                                        </div>
                                    </Menu.Item>
                                    <ExternalDropdownComponent />
                                    <Menu.Item key="3" className="hover:bg-white">
                                        <div className="flex items-center stroke-black hover:stroke-estela hover:text-estela hover:bg-button-hover rounded">
                                            <Logout className="mx-1 w-6 h-6" />
                                            <Link to={""} className="hover:text-estela" onClick={this.logout}>
                                                Logout
                                            </Link>
                                        </div>
                                    </Menu.Item>
                                </Menu>
                            }
                            trigger={["click"]}
                        >
                            <a className="flex items-center hover:bg-button-hover p-2 rounded-lg">
                                <User className="stroke-estela h-6 w-6" />
                                <div className="mx-2 text-sm font-medium text-estela">{this.getUser()}</div>
                                <ArrowDown className="stroke-estela h-5 w-5" />
                            </a>
                        </Dropdown>
                    </Col>
                </Row>
            </Header>
        );
    }
}
