import React, { Component } from "react";
import { Button, Form, Input, Layout, Space, Typography } from "antd";
import Bitmaker from "../../assets/logo/bitmaker.svg";
import { Link } from "react-router-dom";
const { Text } = Typography;
const { Content } = Layout;

export class ChangePasswordPage extends Component<unknown> {
    handleSubmit = (data: { username: string; password: string }): void => {
        console.log(data);
    };

    render(): JSX.Element {
        return (
            <Content className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <Content className="flex h-fit lg:ml-36 sm:h-fit md:h-full lg:h-full m-auto justify-center items-center p-14 sm:p-auto md:p-auto">
                    <Content className="">
                        <p className="text-5xl font-bold">
                            Stable, reliable and <span className="text-estela">open source</span>
                        </p>
                        <p className="text-3xl font-normal py-2 sm:p-auto">
                            Scraped <span className="text-estela">when</span> you want it.
                        </p>
                        <Space className="my-4">
                            <Text className="text-sm font-normal">Powered by&nbsp;</Text>
                            <Bitmaker className="w-28 h-12" />
                        </Space>
                    </Content>
                </Content>
                <Content className="flex h-fit lg:mr-36 sm:h-fit md:h-full lg:h-full justify-center items-center p-6 sm:p-auto">
                    <Form onFinish={this.handleSubmit} layout="vertical" className="p-2 w-96">
                        <Content>
                            <Form.Item
                                label="Username"
                                name="username"
                                required
                                rules={[{ required: true, message: "Please input your username" }]}
                            >
                                <Input autoComplete="username" className="border-estela rounded-md" />
                            </Form.Item>
                            <Form.Item
                                label="Password"
                                name="password"
                                required
                                rules={[{ required: true, message: "Please input your password" }]}
                            >
                                <Input.Password autoComplete="current-password" className="border-estela rounded-md" />
                            </Form.Item>
                        </Content>
                        <Button
                            block
                            htmlType="submit"
                            className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm"
                        >
                            Login
                        </Button>
                        <Content className="text-center text-base m-5">
                            <p>If you don&apos;t have an account. You can</p>
                            <p>
                                <Link className="text-estela text-base underline" to="/register">
                                    register here
                                </Link>
                            </p>
                        </Content>
                    </Form>
                </Content>
            </Content>
        );
    }
}
