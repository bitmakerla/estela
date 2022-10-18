import React, { Component } from "react";
import { Button, Form, Input, Layout } from "antd";
import { Link } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiAuthLoginRequest, Token } from "../../services/api";
import { handleInvalidDataError } from "../../utils";

const { Content } = Layout;

export class LoginPage extends Component<unknown> {
    apiService = ApiService();

    componentDidMount(): void {
        if (AuthService.getAuthToken()) {
            history.push("/projects");
        }
    }

    handleSubmit = (data: { username: string; password: string }): void => {
        const request: ApiAuthLoginRequest = { data };
        this.apiService.apiAuthLogin(request).then(
            (response: Token) => {
                AuthService.setAuthToken(response.key);
                if (response.user !== undefined) {
                    AuthService.setUserUsername(response.user);
                }
                history.push("/projects");
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    render(): JSX.Element {
        return (
            <Layout className="white-background container mx-auto">
                <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    <Content className="flex h-fit lg:ml-36 sm:h-fit md:h-full lg:h-full m-auto justify-center items-center p-14 sm:p-auto md:p-auto">
                        <div className="">
                            <p className="text-5xl font-bold">
                                Stable, reliable and <span className="text-[#4D47C3]">open source</span>
                            </p>
                            <p className="text-3xl font-normal py-2 sm:p-auto">
                                Scraped <span className="text-[#4D47C3]">when</span> you want it.
                            </p>
                            <p className="text-sm font-normal py-4 flex">
                                Powered by&nbsp;
                                <img src="Bitmaker.svg" width="100" className="mx-2" alt="" />
                            </p>
                        </div>
                    </Content>
                    <Content className="flex h-fit lg:mr-36 sm:h-fit md:h-full lg:h-full justify-center items-center p-6 sm:p-auto">
                        <Form onFinish={this.handleSubmit} layout="vertical" className="p-2 w-96">
                            <div className="">
                                <Form.Item
                                    label="Username"
                                    name="username"
                                    required
                                    rules={[{ required: true, message: "Please input your username" }]}
                                >
                                    <Input autoComplete="username" className="border-[#4D47C3]" />
                                </Form.Item>
                                <Form.Item
                                    label="Password"
                                    name="password"
                                    required
                                    rules={[{ required: true, message: "Please input your password" }]}
                                >
                                    <Input.Password autoComplete="current-password" className="border-[#4D47C3]" />
                                </Form.Item>
                            </div>
                            <Button
                                block
                                htmlType="submit"
                                className="border-[#4D47C3] bg-[#4D47C3] hover:border-[#4D47C3] hover:text-[#4D47C3] text-white rounded-md text-sm"
                            >
                                Login
                            </Button>
                            <div className="text-center text-base m-5">
                                <p>If you don&apos;t have an account. You can</p>
                                <p>
                                    <Link className="text-[#4D47C3] text-base underline" to="/register">
                                        register here
                                    </Link>
                                </p>
                            </div>
                        </Form>
                    </Content>
                </div>
            </Layout>
        );
    }
}
