import React, { Component } from "react";
import { Button, Form, Typography, Input, Layout, Row } from "antd";
import { Link } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import { ApiAuthRegisterRequest, Token } from "../../services/api";
import { insecurePasswordNotification, emailConfirmationNotification } from "../../shared";
import { EstelaBanner } from "../../components";

import { handleInvalidDataError } from "../../utils";

const { Content } = Layout;
const { Text } = Typography;

interface RegisterPageState {
    loading: boolean;
    successRegister: boolean;
}

export class RegisterPage extends Component<unknown, RegisterPageState> {
    state: RegisterPageState = {
        loading: false,
        successRegister: false,
    };

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
        this.setState({ loading: true });
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
                this.setState({ successRegister: true });
                this.setState({ loading: false });
            },
            (error: unknown) => {
                handleInvalidDataError(error);
                this.setState({ loading: false });
            },
        );
    };

    render(): JSX.Element {
        const { loading } = this.state;
        return (
            <Content className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <EstelaBanner />
                <Content className="flex h-fit lg:mr-36 sm:h-fit md:h-full lg:h-full justify-center items-center p-6 sm:p-auto">
                    {!this.state.successRegister ? (
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
                                loading={loading}
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
                                        log in here
                                    </Link>
                                </p>
                            </Content>
                        </Form>
                    ) : (
                        <Row justify="center" className="w-96">
                            <Text className="text-3xl font-bold">Thanks for registering!</Text>
                            <Text className="text-center text-lg my-7 text-estela-black-medium">
                                We are thrilled to have you join us! <br />
                                Check the email we just sent you to activate your account
                            </Text>
                            <Button
                                block
                                className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-10"
                                onClick={() => {
                                    history.push("/login");
                                }}
                            >
                                Log in
                            </Button>
                        </Row>
                    )}
                </Content>
            </Content>
        );
    }
}
