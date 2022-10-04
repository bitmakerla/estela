import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Menu, Layout } from "antd";
import { UserOutlined } from "@ant-design/icons";

import "./styles.scss";

const { Sider } = Layout;

export class Sidenav extends Component<unknown> {
    render(): JSX.Element {
        return (
            <Sider width={250}>
                <Menu mode="inline" className="sider-menu">
                    {/* <Menu.Item
                        key="1"
                        title={
                            <>
                                <UserOutlined />
                                <span>Option 2</span>
                            </>
                        }
                    >
                        <UserOutlined />
                        <span>Option 1</span>
                        <Link to="/projects" className="">
                        Projects
                        </Link>
                    </Menu.Item> */}
                    <Menu.Item>
                        <UserOutlined />
                        <span>Option 1</span>
                    </Menu.Item>
                    <Menu.SubMenu
                        title={
                            <>
                                <UserOutlined />
                                <span>Option 2</span>
                            </>
                        }
                    >
                        <Menu.Item>
                            <UserOutlined />
                            <span>Option 1</span>
                        </Menu.Item>
                    </Menu.SubMenu>
                </Menu>
            </Sider>
        );
    }
}
