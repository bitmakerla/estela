import React, { Component } from "react";
import { Button, Form, Space, Typography, Input, Layout, Row } from "antd";
import { Link } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiAuthRegisterRequest, Token } from "../../services/api";
import Bitmaker from "../../assets/logo/bitmaker.svg";
import Estela from "../../assets/icons/estela.svg";
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
                    AuthService.setUserUsername(response.user.username);
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
            <Content className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <Content className="flex h-fit lg:ml-36 sm:h-fit md:h-full lg:h-full m-auto justify-center items-center p-14 sm:p-auto md:p-auto">
                    <Content>
                        <Estela className="w-48 h-24" />
                        <p className="text-5xl font-bold mt-4">
                            Stable, reliable and <span className="text-estela">open source</span>.
                        </p>
                        <p className="text-3xl font-normal py-6 sm:p-auto">
                            Scrape <span className="text-estela">when you want it</span>.
                        </p>
                        <Space>
                            <Text className="text-sm font-normal">Powered by&nbsp;</Text>
                            <Bitmaker className="w-40 h-40" />
                        </Space>
                    </Content>
                </Content>
                <Content className="flex h-fit lg:mr-36 sm:h-fit md:h-full lg:h-full justify-center items-center p-6 sm:p-auto">
                    <Form onFinish={this.handleSubmit} layout="vertical" className="p-2 w-96">
                        <Row justify="center" className="w-96 my-7">
                            <Text className="text-3xl font-bold">Sign up</Text>
                        </Row>
                        <Content className="">
                            <Form.Item
                                label="Email"
                                name="email"
                                required
                                rules={[{ required: true, message: "Please input your email", type: "email" }]}
                            >
                                <Input autoComplete="email" className="border-estela rounded-md py-2" />
                            </Form.Item>
                            <Form.Item
                                label="Username"
                                name="username"
                                required
                                rules={[{ required: true, message: "Please input your username" }]}
                            >
                                <Input autoComplete="username" className="border-estela rounded-md py-2" />
                            </Form.Item>
                            <Form.Item
                                label="Password"
                                name="password"
                                required
                                rules={[{ required: true, message: "Please input your password" }]}
                            >
                                <Input.Password
                                    autoComplete="current-password"
                                    className="border-estela rounded-md py-2"
                                />
                            </Form.Item>
                        </Content>
                        <Button
                            block
                            htmlType="submit"
                            className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-10"
                        >
                            Register
                        </Button>
                        <Content className="text-center text-base m-5">
                            <p>If you already have an account. You can</p>
                            <p>
                                <Link className="text-estela text-base font-bold underline" to="/login">
                                    login here
                                </Link>
                            </p>
                        </Content>
                    </Form>
                </Content>
            </Content>
        );
    }
}
