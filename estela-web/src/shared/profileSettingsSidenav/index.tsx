import React from "react";
import { Link } from "react-router-dom";
import { Menu, Layout } from "antd";
import type { MenuProps } from "antd";

import "./styles.scss";

const { Sider, Content } = Layout;

interface ProfileSettingsSideNavPropsInterface {
    path: string;
    updatePath: (newPath: string) => void;
}

export const ProfileSettingsSideNav: React.FC<ProfileSettingsSideNavPropsInterface> = ({ path, updatePath }) => {
    const items: MenuProps["items"] = [
        {
            key: "1",
            label: <h2 className="m-5 text-estela-black-medium text-base">ACCOUNT SETTINGS</h2>,
            children: [
                {
                    key: "profile",
                    label: (
                        <Content className="pl-2 flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Link to={`/settings/profile`} onClick={() => updatePath("profile")}>
                                Profile
                            </Link>
                        </Content>
                    ),
                },
                {
                    key: "password",
                    label: (
                        <Content className="pl-2 flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Link to={`/settings/password`} onClick={() => updatePath("password")}>
                                Password
                            </Link>
                        </Content>
                    ),
                },
            ],
            type: "group",
        },
        {
            key: "2",
            label: <h2 className="m-5  text-estela-black-medium text-base">PROJECTS SETTINGS</h2>,
            children: [
                {
                    key: "dataPersistence",
                    label: (
                        <Content className="pl-2 flex items-center hover:bg-button-hover stroke-black hover:stroke-estela rounded">
                            <Link to={`/settings/dataPersistence`} onClick={() => updatePath("dataPersistence")}>
                                Data persistence
                            </Link>
                        </Content>
                    ),
                },
            ],
            type: "group",
        },
    ];

    return (
        <Sider width={240}>
            <Menu items={items} mode="inline" className="h-full" selectedKeys={[`${path}`]} />
        </Sider>
    );
};
