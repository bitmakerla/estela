import React, { Component } from "react";
import { Button, Layout, Space, Modal, Typography, Form, Row, Col, Input } from "antd";
import type { FormInstance } from "antd/es/form/Form";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiAccountChangePasswordChangeRequest } from "../../services/api";
import { wrongPasswordNotification, passwordChangedNotification, Spin } from "../../shared";

const { Content } = Layout;
const { Text } = Typography;

interface PasswordSettingsPageState {
    loaded: boolean;
    email: string;
    successfullyChanged: boolean;
    loadingSendRequest: boolean;
    showPasswordModal: boolean;
    newPassword: string;
    confirmNewPassword: string;
}

export class SettingsPasswordPage extends Component<unknown, PasswordSettingsPageState> {
    state: PasswordSettingsPageState = {
        loaded: false,
        email: "",
        successfullyChanged: false,
        loadingSendRequest: false,
        showPasswordModal: false,
        newPassword: "",
        confirmNewPassword: "",
    };

    apiService = ApiService();
    newPasswordsForm = React.createRef<FormInstance<{ newPassword: string; confirmNewPassword: string }>>();
    oldPasswordForm = React.createRef<FormInstance<{ password: string }>>();

    async componentDidMount(): Promise<void> {
        this.setState({ loaded: true, email: AuthService.getUserEmail() || "" });
    }

    onFinishNewPasswordsHandler = () => {
        this.setState({
            showPasswordModal: true,
        });
    };

    onValuesChangeNewPasswordsHandler = ({
        newPassword,
        confirmNewPassword,
    }: {
        newPassword: string;
        confirmNewPassword: string;
    }) => {
        if (newPassword) this.setState({ newPassword });
        if (confirmNewPassword) this.setState({ confirmNewPassword });
        this.newPasswordsForm.current?.validateFields();
    };

    onFinishPasswordFormHandler = (values: { password: string }) => {
        this.setState({ loadingSendRequest: true });
        const requestParams: ApiAccountChangePasswordChangeRequest = {
            data: {
                newPassword: this.state.newPassword,
                confirmNewPassword: this.state.confirmNewPassword,
                oldPassword: values.password,
            },
        };
        this.apiService.apiAccountChangePasswordChange(requestParams).then(
            (response) => {
                if (response) {
                    passwordChangedNotification();
                    this.newPasswordsForm.current?.resetFields();
                    this.setState({ loadingSendRequest: false, successfullyChanged: true, showPasswordModal: false });
                }
            },
            () => {
                // Error
                wrongPasswordNotification();
                this.oldPasswordForm.current?.resetFields();
                this.setState({ loadingSendRequest: false });
            },
        );
    };

    render(): JSX.Element {
        const { loaded, successfullyChanged, showPasswordModal, loadingSendRequest } = this.state;
        return (
            <>
                {loaded ? (
                    <Content className="mx-6 px-14 bg-white">
                        <Row className="w-full my-4">
                            <div className="float-left">
                                <p className="text-3xl">Change password</p>
                            </div>
                        </Row>
                        <Form
                            layout="vertical"
                            onFinish={this.onFinishNewPasswordsHandler}
                            onValuesChange={this.onValuesChangeNewPasswordsHandler}
                            ref={this.newPasswordsForm}
                        >
                            <Space direction="vertical" className="w-full 2xl:w-9/12 my-2">
                                <Form.Item
                                    label={<p className="text-estela-black-low">New password</p>}
                                    name="newPassword"
                                    rules={[{ required: true, message: "Please enter new password." }]}
                                >
                                    <Input.Password className="border-estela-black-low rounded-md py-3" />
                                </Form.Item>
                                <Form.Item
                                    label={<p className="text-estela-black-low">Confirm new password</p>}
                                    name="confirmNewPassword"
                                    rules={[
                                        { required: true, message: "Please confirm new password." },
                                        {
                                            message: "Passwords do not match.",
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
                                    <Input.Password className="border-estela-black-low rounded-md py-3" />
                                </Form.Item>
                                <Button
                                    block
                                    htmlType="submit"
                                    className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-12"
                                    disabled={successfullyChanged}
                                >
                                    Save changes
                                </Button>
                            </Space>
                        </Form>
                        <Modal
                            open={showPasswordModal}
                            footer={false}
                            width={600}
                            title={
                                <p className="text-xl text-center text-estela-black-medium font-normal">
                                    CONFIRM ACTION
                                </p>
                            }
                            onCancel={() => this.setState({ showPasswordModal: false })}
                        >
                            <div className="p-2 grid justify-items-center">
                                <Text className="text-estela-black-full text-base">
                                    Enter your current password to save your changes.
                                </Text>
                            </div>
                            <div className="py-4 px-8">
                                <Form
                                    labelCol={{ span: 24 }}
                                    wrapperCol={{ span: 24 }}
                                    onFinish={this.onFinishPasswordFormHandler}
                                    ref={this.oldPasswordForm}
                                >
                                    <Form.Item
                                        label={<p className="text-estela-black-full text-base">Password</p>}
                                        name="password"
                                        rules={[{ required: true, message: "Please enter your Password!" }]}
                                    >
                                        <Input.Password className="border-estela-black-low rounded-md py-3" />
                                    </Form.Item>
                                    <Row className="mt-4 grid grid-cols-2 gap-2" align="middle" justify="center">
                                        <Col>
                                            <Button
                                                size="large"
                                                loading={loadingSendRequest}
                                                className="w-full h-12 items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                                htmlType="submit"
                                            >
                                                Confirm
                                            </Button>
                                        </Col>
                                        <Col>
                                            <Button
                                                size="large"
                                                className="w-full h-12 ml-1 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                                                onClick={() => this.setState({ showPasswordModal: false })}
                                            >
                                                Cancel
                                            </Button>
                                        </Col>
                                    </Row>
                                </Form>
                            </div>
                        </Modal>
                    </Content>
                ) : (
                    <Spin />
                )}
            </>
        );
    }
}
