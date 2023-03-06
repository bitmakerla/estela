import React, { Component } from "react";
import { Layout, Space } from "antd";

import "./styles.scss";

import Ellipse from "../../assets/icons/ellipse.svg";

const { Content } = Layout;

const notis = [
    {
        id: 1,
        seen: false,
        message: "We are working on this feature.",
        date: "Soon",
    },
];

export class NotificationsList extends Component<unknown, unknown> {
    render(): JSX.Element {
        return (
            <Layout className="flex sm:w-5/5 w-5/5 bg-white">
                {notis.map((notification) => {
                    return (
                        <Content key={notification.id}>
                            <Layout className="bg-white p-2 overflow-hidden hover:text-estela hover:bg-estela-blue-low rounded-md">
                                <Space className="flex items-center" align="end">
                                    {!notification.seen ? (
                                        <Ellipse className="mx-1 fill-current text-estela" width={20} height={20} />
                                    ) : (
                                        <Ellipse className="mx-1 fill-current text-white" width={20} height={20} />
                                    )}
                                    <Content>
                                        <Content className="text-sm overflow-ellipsis">{notification.message}</Content>
                                        <Content className="text-xs text-estela-black-low">{notification.date}</Content>
                                    </Content>
                                </Space>
                            </Layout>
                        </Content>
                    );
                })}
            </Layout>
        );
    }
}
