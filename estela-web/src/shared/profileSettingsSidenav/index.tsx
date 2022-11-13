import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Menu, Layout } from "antd";

import "./styles.scss";

const { Sider } = Layout;

interface ProfileSettingsSideNavPropsInterface {
    path: string;
}

export class ProfileSettingsSideNav extends Component<ProfileSettingsSideNavPropsInterface, unknown> {
    path = this.props.path;
    render(): JSX.Element {
        return (
            <Sider width={240}>
                <Menu mode="inline" className="h-full" selectedKeys={[`${this.path}`]}>
                    <div>
                        <p className="m-5 text-estela-black-medium text-base">ACCOUNT SETTINGS</p>
                    </div>
                    <Menu.Item key={"/profile"} className="">
                        <div className="pl-2 flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Link to={`/settings/profile`}>Profile</Link>
                        </div>
                    </Menu.Item>
                    <Menu.Item key={"/password"} className="">
                        <div className="pl-2 flex items-center stroke-black hover:stroke-estela hover:bg-button-hover hover:text-estela rounded">
                            <Link to={`/settings/password`}>Password</Link>
                        </div>
                    </Menu.Item>
                    <div>
                        <h2 className="m-5  text-estela-black-medium text-base">PROJECTS SETTINGS</h2>
                    </div>
                    <Menu.Item key={"/dataPersistence"} className="">
                        <div className="pl-2 flex items-center hover:bg-button-hover stroke-black hover:stroke-estela rounded">
                            <Link to={`/settings/dataPersistence`}>Data persistence</Link>
                        </div>
                    </Menu.Item>
                </Menu>
            </Sider>
        );
    }
}
