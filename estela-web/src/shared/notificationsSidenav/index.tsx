import React from "react";
import { Link } from "react-router-dom";
import { Menu, Layout } from "antd";
import type { MenuProps } from "antd";

import "./styles.scss";

const { Sider, Content } = Layout;

interface NotificationsInboxPropsInterface {
    path: string;
    updatePath: (newPath: string) => void;
}

export const NotificationsSidenav: React.FC<NotificationsInboxPropsInterface> = ({ path, updatePath }) => {
    const items: MenuProps["items"] = [
        {
            key: "1",
            label: <p className="m-5 text-estela-black-medium text-base">NOTIFICATIONS</p>,
            children: [
                {
                    key: "inbox",
                    label: (
                        <Content className="flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Link to={`/notifications/inbox`} onClick={() => updatePath("inbox")} className="ml-2">
                                Inbox
                            </Link>
                        </Content>
                    ),
                },
                {
                    key: "settings",
                    label: (
                        <Content className="flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Link
                                to={`/notifications/settings`}
                                onClick={() => updatePath("settings")}
                                className="ml-2"
                            >
                                Settings
                            </Link>
                        </Content>
                    ),
                },
            ],
            type: "group",
        },
    ];

    return (
        <Sider width={240} className="mr-5">
            <Menu items={items} mode="inline" className="h-full" selectedKeys={[`${path}`]} />
        </Sider>
    );
};
