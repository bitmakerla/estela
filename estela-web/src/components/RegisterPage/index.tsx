import React, { Component } from "react";
import { Button, Form, Space, Typography, Input, Layout } from "antd";
import { Link } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiAuthRegisterRequest, Token } from "../../services/api";
import Bitmaker from "../../assets/logo/bitmaker.svg";
import { insecurePasswordNotification, emailConfirmationNotification } from "../../shared";

import { handleInvalidDataError } from "../../utils";

const { Content } = Layout;
const { Text } = Typography;

export class RegisterPage extends Component<unknown> {
    apiService = ApiService();

    componentDidMount(): void {
        if (AuthService.getAuthToken()) {
            history.push("/projects");
        }
    }

    isAlphanumeric(word: string): boolean {
        const alpha = /([a-zA-Z])/;
        const numeric = /(\d)/;
        if (alpha.test(word) && numeric.test(word)) {
            return true;
        }
        insecurePasswordNotification("Your password must contain letters and numbers.");
        return false;
    }

    lowercaseAndUppercase(word: string): boolean {
        if (word == word.toUpperCase() || word == word.toLowerCase()) {
            insecurePasswordNotification("You password must contain upper case and lower case letters.");
            return false;
        }
        return true;
    }

    hasMinLength(word: string, length: number): boolean {
        if (word.length < length) {
            insecurePasswordNotification("You password must contain at least 8 characters.");
            return false;
        }
        return true;
    }

    validatePassword(password: string): boolean {
        if (this.hasMinLength(password, 8) && this.lowercaseAndUppercase(password) && this.isAlphanumeric(password)) {
            return true;
        }
        return false;
    }

    handleSubmit = (data: { email: string; username: string; password: string }): void => {
        if (!this.validatePassword(data.password)) {
            return;
        }

        const request: ApiAuthRegisterRequest = { data };
        this.apiService.apiAuthRegister(request).then(
            (response: Token) => {
                if (response.user !== undefined) {
                    AuthService.setUserUsername(response.user);
                }
                emailConfirmationNotification();
                history.push("/login");
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    render(): JSX.Element {
        return (
            <Layout className="white-background h-screen container mx-auto">
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
                            <Content className="">
                                <Form.Item
                                    label="Email"
                                    name="email"
                                    required
                                    rules={[{ required: true, message: "Please input your email", type: "email" }]}
                                >
                                    <Input autoComplete="email" className="border-estela rounded-md" />
                                </Form.Item>
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
                                    <Input.Password
                                        autoComplete="current-password"
                                        className="border-estela rounded-md"
                                    />
                                </Form.Item>
                            </Content>
                            <Button
                                block
                                htmlType="submit"
                                className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm"
                            >
                                Register
                            </Button>
                            <Content className="text-center text-base m-5">
                                <p>If you already have an account. You can</p>
                                <p>
                                    <Link className="text-estela text-base underline" to="/login">
                                        login here
                                    </Link>
                                </p>
                            </Content>
                        </Form>
                    </Content>
                </Content>
            </Layout>
        );
    }
}
