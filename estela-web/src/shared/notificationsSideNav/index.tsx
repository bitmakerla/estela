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

export const NotificationsSideNav: React.FC<NotificationsInboxPropsInterface> = ({ path, updatePath }) => {
    const items: MenuProps["items"] = [
        {
            key: "1",
            label: <p className="m-5 text-estela-black-medium text-base">NOTIFICATIONS</p>,
            children: [
                {
                    key: "inbox",
                    label: (
                        <Content className="flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Link to={`/notifications/inbox`} onClick={() => updatePath("inbox")} className="mx-4">
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
                                className="mx-4"
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
        <Sider width={240} className="rounded-l-2xl">
            <Menu items={items} mode="inline" className="h-full rounded-l-2xl" selectedKeys={[`${path}`]} />
        </Sider>
    );
};
