import React, { Component } from "react";
import { Layout, Row, Col, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { Link } from "react-router-dom";

import history from "../../history";
import { AuthService } from "../../services";
import { NotificationsList } from "../../shared";

import User from "../../assets/icons/user.svg";
import Notification from "../../assets/icons/notification.svg";
import ArrowDown from "../../assets/icons/arrowDown.svg";
import Dashboard from "../../assets/icons/dashboard.svg";
import Settings from "../../assets/icons/setting.svg";
import Logout from "../../assets/icons/logout.svg";
import userDropdownSidenavItems from "ExternalDropdownComponent/DropdownComponent";

const { Header, Content } = Layout;
type MenuItem = Required<MenuProps>["items"][number];

interface HeaderInterface {
    path?: string;
}

export class CustomHeader extends Component<HeaderInterface, unknown> {
    constructor(props: HeaderInterface) {
        super(props);
        userDropdownSidenavItems.forEach((element: MenuItem) => {
            this.itemsUser?.push(element);
        });
        const key_logout = this.itemsUser?.length;
        this.itemsUser?.push({
            key: `${key_logout}`,
            label: (
                <Content className="stroke-black hover:stroke-estela hover:bg-button-hover rounded">
                    <Link to={""} className="flex items-center hover:text-estela-blue-full" onClick={this.logout}>
                        <Logout className="mx-1 w-6 h-6" />
                        Logout
                    </Link>
                </Content>
            ),
            style: { backgroundColor: "white" },
        });
    }
    path = this.props.path;
    isLogged = (): boolean => {
        return Boolean(AuthService.getAuthToken());
    };

    getUser = (): string => {
        return String(AuthService.getUserUsername());
    };

    getUserRole = (): string => {
        return String(AuthService.getUserRole());
    };

    logout = (): void => {
        AuthService.removeAuthToken();
        history.push("/login");
    };

    itemsUser: MenuProps["items"] = [
        {
            key: "1",
            label: (
                <Content className="stroke-black hover:stroke-estela hover:bg-button-hover rounded">
                    <Link to={""} className="flex items-center hover:text-estela-blue-full">
                        <Dashboard className="mx-1 w-6 h-6" />
                        Home
                    </Link>
                </Content>
            ),
            style: { backgroundColor: "white" },
        },
        {
            key: "2",
            label: (
                <Content className="stroke-black hover:stroke-estela-blue-full hover:bg-button-hover rounded">
                    <Link to={"/settings/profile"} className="flex items-center hover:text-estela-blue-full">
                        <Settings className="mx-1 w-6 h-6" />
                        Account Settings
                    </Link>
                </Content>
            ),
            style: { backgroundColor: "white" },
        },
    ];

    itemsNotification: MenuProps["items"] = [
        {
            key: "1",
            label: (
                <Content className="bg-white w-96">
                    <NotificationsList />
                </Content>
            ),
            style: { backgroundColor: "white" },
        },
        {
            key: "2",
            label: (
                <Content className="bg-white w-96">
                    <Link
                        className="text-estela-blue-full opacity-40 h-8 items-center text-center rounded-md hover:text-estela-blue-full hover:bg-estela-blue-low font-semibold flex justify-center"
                        to={"/notifications/inbox"}
                    >
                        See all
                    </Link>
                </Content>
            ),
            disabled: true,
            style: { backgroundColor: "white" },
        },
    ];

    render(): JSX.Element {
        return (
            <Header className="bg-white h-[72px]">
                <Row justify="center" align="middle" className="flex justify-center">
                    <Col flex={1} className="my-1">
                        <Link to="/" className="text-xl hover:text-estela">
                            estela
                        </Link>
                    </Col>
                    <Col flex={0.06}>
                        <Dropdown menu={{ items: this.itemsNotification }} trigger={["click"]}>
                            {this.path === "/notifications/inbox" ? (
                                <a className="flex justify-center items-center border border-estela stroke-estela rounded-lg bg-estela-blue-low w-10 p-2 m-1">
                                    <Notification className="w-8 h-8" />
                                </a>
                            ) : (
                                <a className="flex justify-center items-center hover:stroke-estela stroke-black hover:bg-button-hover rounded-lg w-10 p-2 m-1">
                                    <Notification className="w-8 h-8" />
                                </a>
                            )}
                        </Dropdown>
                    </Col>
                    <Col>
                        <Dropdown menu={{ items: this.itemsUser }} trigger={["click"]}>
                            <a className="flex items-center px-2 hover:bg-estela-blue-low hover:text-estela-blue-full text-estela-blue-full rounded-lg">
                                <Row className="flex grid-cols-3 justify-center gap-3">
                                    <Col className="my-5">
                                        <User className="stroke-estela h-6 w-6" />
                                    </Col>
                                    <Row className="grid grid-cols-1 my-3">
                                        <Col className="font-medium text-sm h-6">{this.getUser()}</Col>
                                        <Col className="text-estela-black-medium text-xs h-4">{this.getUserRole()}</Col>
                                    </Row>
                                    <Col className="my-5">
                                        <ArrowDown className="stroke-estela h-5 w-5" />
                                    </Col>
                                </Row>
                            </a>
                        </Dropdown>
                    </Col>
                </Row>
            </Header>
        );
    }
}
