import React, { Component } from "react";
import { Button, Form, Input, Layout } from "antd";
import { Link } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiAuthRegisterRequest, Token } from "../../services/api";
import { insecurePasswordNotification, emailConfirmationNotification } from "../../shared";

import { handleInvalidDataError } from "../../utils";

const { Content } = Layout;

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
                                    label="Email"
                                    name="email"
                                    required
                                    rules={[{ required: true, message: "Please input your email", type: "email" }]}
                                >
                                    <Input autoComplete="email" className="border-[#4D47C3]" />
                                </Form.Item>
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
                                Register
                            </Button>
                            <div className="text-center text-base m-5">
                                <p>If you already have an account. You can</p>
                                <p>
                                    <Link className="text-[#4D47C3] text-base underline" to="/login">
                                        login here
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
