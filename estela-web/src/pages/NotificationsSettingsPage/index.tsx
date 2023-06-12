import React, { Component } from "react";
import { Layout, Space, Row } from "antd";

import "./styles.scss";

const { Content } = Layout;

export class NotificationsSettingsPage extends Component<unknown, unknown> {
    render(): JSX.Element {
        return (
            <Layout className="bg-white">
                <Content className="m-10">
                    <p className="text-2xl mb-6 text-black">Notifications settings</p>
                    <Content className="bg-white w-4/5 flex-col">
                        <Row className="pb-8">
                            <Space>
                                <label className="inline-flex relative items-center mr-5 cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 rounded-full peer  peer-focus:ring-green-300  peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                                <div>
                                    <p className="text-estela-black-medium">News and Updates</p>
                                    <p className="text-estela-black-low text-xs">
                                        News about Estela and feature updates.
                                    </p>
                                </div>
                            </Space>
                        </Row>
                        <Row>
                            <Space>
                                <label className="inline-flex relative items-center mr-5 cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 rounded-full peer  peer-focus:ring-green-300  peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                                <div>
                                    <p className="text-estela-black-medium">Reply to Personal Email</p>
                                    <p className="text-xs text-estela-black-low">
                                        Reply Estela notifications to my personal email scraper202122@domain.com.
                                    </p>
                                </div>
                            </Space>
                        </Row>
                    </Content>
                </Content>
            </Layout>
        );
    }
}
