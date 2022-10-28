import React, { Component } from "react";
import { Layout, Row, Col, Menu, Dropdown } from "antd";
import { Link } from "react-router-dom";

import history from "../../history";
import { AuthService } from "../../services";
import { NotificationsList } from "../../shared";

import { ReactComponent as User } from "../../assets/icons/user.svg";
import { ReactComponent as Notification } from "../../assets/icons/notification.svg";
import { ReactComponent as ArrowDown } from "../../assets/icons/arrowDown.svg";
import { ReactComponent as Dashboard } from "../../assets/icons/dashboard.svg";
import { ReactComponent as Settings } from "../../assets/icons/setting.svg";
import { ReactComponent as Billing } from "../../assets/icons/billing.svg";
import { ReactComponent as Logout } from "../../assets/icons/logout.svg";

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
                    <Col flex={0.02} className="">
                        <Dropdown
                            overlay={
                                <Layout className="p-5 w-96">
                                    <NotificationsList />
                                    <Link className="text-estela flex justify-center" to={"/notifications/inbox"}>
                                        See all
                                    </Link>
                                </Layout>
                            }
                            trigger={["click"]}
                        >
                            {this.path === "/notifications/inbox" ? (
                                <Content className="items-center border border-estela rounded-lg bg-estela-blue-low flex justify-center w-12 h-12">
                                    <Notification className="text-estela stroke-estela rounded" />
                                </Content>
                            ) : (
                                <Content className="items-center hover:bg-button-hover rounded-lg flex justify-center w-12 h-12">
                                    <Notification className=" stroke-black hover:stroke-estela rounded" />
                                </Content>
                            )}
                        </Dropdown>
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
                                            <Link to={"/settings/profile"} className="hover:text-estela">
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
                                <User className="stroke-estela" width={26} />
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
