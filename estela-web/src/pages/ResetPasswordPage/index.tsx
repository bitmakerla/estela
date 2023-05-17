import React, { Component } from "react";
import { Button, Form, Input, Layout, Space, Typography, Row } from "antd";
import type { FormInstance } from "antd/es/form";
import { ApiService } from "../../services";
import { ApiAccountResetPasswordConfirmRequest, ApiAccountResetPasswordValidateRequest } from "../../services/api";
import history from "../../history";
import Bitmaker from "../../assets/logo/bitmaker.svg";
import Estela from "../../assets/icons/estela.svg";
import { Spin } from "../../shared";
import { handleInvalidDataError } from "../../utils";
const { Text } = Typography;
const { Content } = Layout;

interface ResetPasswordPageProps {
    location: {
        search: string;
    };
}

interface ResetPasswordPageState {
    loaded: boolean;
    succesfullyChanged: boolean;
    token: string;
    pair: string;
    linkExpired: boolean;
    newPassword: string;
    confirmNewPassword: string;
    sendingRequest: boolean;
}

export class ResetPasswordPage extends Component<ResetPasswordPageProps, ResetPasswordPageState> {
    state = {
        loaded: false,
        succesfullyChanged: false,
        linkExpired: false,
        token: "",
        pair: "",
        newPassword: "",
        confirmNewPassword: "",
        sendingRequest: false,
    };
    private formRef = React.createRef<FormInstance>();
    apiService = ApiService();
    componentDidMount(): void {
        const query = new URLSearchParams(this.props.location.search);
        if (!query.get("token") || !query.get("pair")) {
            history.push("/login");
        }
        const requestParameters: ApiAccountResetPasswordValidateRequest = {
            token: query.get("token") || "",
            pair: query.get("pair") || "",
        };
        this.apiService
            .apiAccountResetPasswordValidate(requestParameters)
            .then(() => {
                this.setState({
                    token: query.get("token") || "",
                    pair: query.get("pair") || "",
                    loaded: true,
                });
            })
            .catch((error: unknown) => {
                handleInvalidDataError(error);
                this.setState({ linkExpired: true, loaded: true });
            });
    }

    handleSubmit = (data: { newPassword: string; confirmNewPassword: string }): void => {
        this.setState({ sendingRequest: true });
        const requestParameters: ApiAccountResetPasswordConfirmRequest = {
            token: this.state.token,
            pair: this.state.pair,
            data,
        };
        this.apiService
            .apiAccountResetPasswordConfirm(requestParameters)
            .then(() => {
                this.setState({ succesfullyChanged: true, sendingRequest: false });
            })
            .catch((error: unknown) => {
                handleInvalidDataError(error);
                this.setState({ sendingRequest: false });
                this.formRef.current?.resetFields();
            });
    };

    onValuesChangeHandler = ({
        newPassword,
        confirmNewPassword,
    }: {
        newPassword: string;
        confirmNewPassword: string;
    }): void => {
        if (newPassword) this.setState({ newPassword });
        if (confirmNewPassword) this.setState({ confirmNewPassword });
        this.formRef.current?.validateFields();
    };

    handleChangeEmail = (): void => {
        this.setState({ succesfullyChanged: false });
    };

    render(): JSX.Element {
        const { loaded, succesfullyChanged, linkExpired, sendingRequest } = this.state;
        return loaded ? (
            <Content className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <Content className="flex h-fit lg:ml-36 sm:h-fit md:h-full lg:h-full m-auto justify-center items-center p-14 sm:p-auto md:p-auto">
                    <Content>
                        <Bitmaker className="w-64 h-48" />
                        <p className="text-5xl font-bold">Reset your password</p>
                        <p className="text-3xl font-normal py-6 sm:p-auto">
                            Remember to use uppercase, numbers and special characters.
                        </p>
                        <Space className="my-4">
                            <Text className="text-sm font-normal">Powered by&nbsp;</Text>
                            <Estela className="w-24 h-8" />
                        </Space>
                    </Content>
                </Content>
                <Content className="flex h-fit lg:mr-36 sm:h-fit md:h-full lg:h-full justify-center items-center p-6 sm:p-auto">
                    {succesfullyChanged ? (
                        <Row justify="center" className="w-96">
                            <Text className="text-3xl font-bold">Successful password reset!</Text>
                            <Text className="text-center text-lg my-7 text-estela-black-medium">
                                You can now use your new password to log in to your account!
                            </Text>
                            <Button
                                block
                                className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-10"
                                onClick={() => {
                                    history.push("/login");
                                }}
                            >
                                Login
                            </Button>
                        </Row>
                    ) : (
                        <>
                            {linkExpired ? (
                                <Row justify="center" className="w-96">
                                    <Text className="text-3xl font-bold">Expired link!!</Text>
                                    <Text className="text-center text-lg my-7 text-estela-black-medium">
                                        The link you are trying to enter seems to have expired. Remember that you only
                                        have <span className="font-bold">3 minutes</span>.
                                    </Text>
                                    <Button
                                        block
                                        className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-10"
                                        onClick={() => {
                                            history.push("/forgotPassword");
                                        }}
                                    >
                                        Send request
                                    </Button>
                                </Row>
                            ) : (
                                <Form
                                    ref={this.formRef}
                                    onFinish={this.handleSubmit}
                                    onValuesChange={this.onValuesChangeHandler}
                                    layout="vertical"
                                    className="p-2 w-96"
                                >
                                    <Content>
                                        <Form.Item
                                            label="New password"
                                            name="newPassword"
                                            required
                                            rules={[{ required: true, message: "Plase, confirm your new password." }]}
                                        >
                                            <Input.Password className="border-estela rounded-md py-2" />
                                        </Form.Item>
                                        <Form.Item
                                            label="Confirm new password"
                                            name="confirmNewPassword"
                                            required
                                            rules={[
                                                { required: true, message: "Plase, enter your new password." },
                                                {
                                                    message: "Passwords must match.",
                                                    validator: (_, value) => {
                                                        if (
                                                            value === this.state.newPassword ||
                                                            value === undefined ||
                                                            value === ""
                                                        )
                                                            return Promise.resolve();
                                                        return Promise.reject();
                                                    },
                                                },
                                            ]}
                                        >
                                            <Input.Password className="border-estela rounded-md py-2" />
                                        </Form.Item>
                                    </Content>
                                    <Button
                                        loading={sendingRequest}
                                        block
                                        htmlType="submit"
                                        className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-10 mt-5"
                                    >
                                        Reset password
                                    </Button>
                                </Form>
                            )}
                        </>
                    )}
                </Content>
            </Content>
        ) : (
            <Spin />
        );
    }
}
