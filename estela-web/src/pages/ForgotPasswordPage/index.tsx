import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Button, Form, Input, Layout, Typography, Row } from "antd";
import type { FormInstance } from "antd/es/form";

import { ApiService } from "../../services";
import { ApiAccountResetPasswordRequestRequest } from "../../services/api";
import { Spin } from "../../shared";
import { handleInvalidDataError } from "../../utils";
import { EstelaBanner } from "../../components";

const { Text } = Typography;
const { Content } = Layout;

interface ForgotPasswordPageState {
    loaded: boolean;
    requestSended: boolean;
    sendingRequest: boolean;
    email: string;
}

export class ForgotPasswordPage extends Component<unknown, ForgotPasswordPageState> {
    state = {
        loaded: false,
        requestSended: false,
        sendingRequest: false,
        email: "",
    };
    private formRef = React.createRef<FormInstance>();
    apiService = ApiService();
    componentDidMount(): void {
        this.setState({ loaded: true });
    }

    handleSubmit = ({ email }: { email: string }): void => {
        this.setState({ sendingRequest: true });
        const requestParams: ApiAccountResetPasswordRequestRequest = { data: { email } };
        this.apiService
            .apiAccountResetPasswordRequest(requestParams)
            .then(() => {
                this.setState({ requestSended: true, email, sendingRequest: false });
            })
            .catch((error: unknown) => {
                handleInvalidDataError(error);
                this.formRef.current?.resetFields();
                this.setState({ sendingRequest: false });
            });
    };

    handleChangeEmail = (): void => {
        this.setState({ requestSended: false });
    };

    render(): JSX.Element {
        const { loaded, requestSended, email, sendingRequest } = this.state;
        return loaded ? (
            <Content className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <EstelaBanner />
                <Content className="flex h-fit lg:mr-36 sm:h-fit md:h-full lg:h-full justify-center items-center p-6 sm:p-auto">
                    {requestSended ? (
                        <Row justify="center">
                            <Text className="text-3xl font-bold">Forgot password</Text>
                            <Text className="text-center text-xl my-7 text-estela-black-medium">
                                We have sent a dynamic link to <span className="font-bold">{email}</span>. Please check
                                your inbox.
                            </Text>
                            <Button type="link" className="font-bold text-estela" onClick={this.handleChangeEmail}>
                                Change email
                            </Button>
                        </Row>
                    ) : (
                        <Form ref={this.formRef} onFinish={this.handleSubmit} layout="vertical" className="p-2 w-96">
                            <Row justify="center">
                                <Text className="text-3xl font-bold">Forgot password</Text>
                                <Text className="text-center text-xl my-7 text-estela-black-medium">
                                    Enter the email address associated with your account.
                                </Text>
                            </Row>
                            <Content>
                                <Form.Item
                                    label="Email address"
                                    name="email"
                                    required
                                    rules={[{ required: true, message: "Plase, enter your email address" }]}
                                >
                                    <Input
                                        autoComplete="email"
                                        className="border-estela rounded-md py-2"
                                        placeholder="Enter your email address"
                                    />
                                </Form.Item>
                            </Content>
                            <Button
                                block
                                htmlType="submit"
                                loading={sendingRequest}
                                className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-10 mt-5"
                            >
                                Reset password
                            </Button>
                            <Content className="text-center mt-4">
                                <Link className="text-estela text-base font-bold" to="/login">
                                    Back to login
                                </Link>
                            </Content>
                        </Form>
                    )}
                </Content>
            </Content>
        ) : (
            <Spin />
        );
    }
}
