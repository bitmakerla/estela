import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Menu, Layout } from "antd";

import "./styles.scss";

const { Sider } = Layout;

interface NotificationsInboxPropsInterface {
    path: string;
}

export class NotificationsSidenav extends Component<NotificationsInboxPropsInterface, unknown> {
    path = this.props.path;
    render(): JSX.Element {
        return (
            <Sider width={240} className="mr-5">
                <Menu mode="inline" className="h-full" selectedKeys={[`${this.path}`]}>
                    <div>
                        <p className="m-5 text-estela-black-medium text-base">NOTIFICATIONS</p>
                    </div>
                    <Menu.Item key={"/notifications/inbox"} className="">
                        <div className="flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Link to={`/notifications/inbox`}>Inbox</Link>
                        </div>
                    </Menu.Item>
                    <Menu.Item key={"/notifications/settings"} className="">
                        <div className="flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Link to={`/notifications/settings`}>Settings</Link>
                        </div>
                    </Menu.Item>
                </Menu>
            </Sider>
        );
    }
}
