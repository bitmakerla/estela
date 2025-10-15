import React, { Component } from "react";
import { Form, Input, Select, Button, Space, Divider, Typography, Row, Col } from "antd";
import { Connection, ConnectionConnTypeEnum } from "../../services/api/generated-api";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface ConnectionFormProps {
    connection?: Connection;
    onSubmit: (data: ConnectionFormData) => Promise<void>;
    onCancel: () => void;
    isEdit?: boolean;
}

export interface ConnectionFormData {
    name: string;
    conn_type: ConnectionConnTypeEnum;
    host?: string;
    port?: string;
    login?: string;
    password?: string;
    extra?: Record<string, any>;
}

interface ConnectionFormState {
    submitting: boolean;
    selectedType: ConnectionConnTypeEnum | undefined;
    extraJsonError: string | null;
}

const ConnectionTypeLabels: Record<ConnectionConnTypeEnum, string> = {
    [ConnectionConnTypeEnum.Database]: "Database",
    [ConnectionConnTypeEnum.S3]: "AWS S3",
    [ConnectionConnTypeEnum.Ftp]: "FTP",
    [ConnectionConnTypeEnum.Sftp]: "SFTP",
    [ConnectionConnTypeEnum.Http]: "HTTP",
    [ConnectionConnTypeEnum.Webhook]: "Webhook",
};

export class ConnectionFormComponent extends Component<ConnectionFormProps, ConnectionFormState> {
    formRef = React.createRef<any>();

    state: ConnectionFormState = {
        submitting: false,
        selectedType: this.props.connection?.connType,
        extraJsonError: null,
    };

    componentDidMount(): void {
        if (this.props.connection) {
            // Pre-populate form with existing connection data
            const { connection } = this.props;
            this.formRef.current?.setFieldsValue({
                name: connection.name,
                conn_type: connection.connType, // Map from camelCase to snake_case for form
                host: connection.host,
                port: connection.port,
                login: connection.login,
                extra: connection.extra ? JSON.stringify(connection.extra, null, 2) : "",
            });
            this.setState({ selectedType: connection.connType });
        }
    }

    handleTypeChange = (connType: ConnectionConnTypeEnum): void => {
        this.setState({ selectedType: connType });
        // Clear fields that might not be relevant for the new type
        this.formRef.current?.setFieldsValue({
            host: "",
            port: "",
            login: "",
            password: "",
            extra: "",
        });
    };

    validateExtraJson = (_: any, value: string): Promise<void> => {
        if (!value || value.trim() === "") {
            this.setState({ extraJsonError: null });
            return Promise.resolve();
        }

        try {
            JSON.parse(value);
            this.setState({ extraJsonError: null });
            return Promise.resolve();
        } catch (error) {
            this.setState({ extraJsonError: "Invalid JSON format" });
            return Promise.reject(new Error("Please enter valid JSON"));
        }
    };

    handleSubmit = (values: any): void => {
        console.log("Form values:", values);
        this.setState({ submitting: true });

        // Parse extra JSON if provided
        let extraData = undefined;
        if (values.extra && values.extra.trim()) {
            try {
                extraData = JSON.parse(values.extra);
            } catch (error) {
                this.setState({ submitting: false });
                return;
            }
        }

        const formData: ConnectionFormData = {
            name: values.name,
            conn_type: values.conn_type,
            host: values.host || undefined,
            port: values.port || undefined,
            login: values.login || undefined,
            password: values.password || undefined,
            extra: extraData,
        };

        console.log("Form data being submitted:", formData);

        this.props
            .onSubmit(formData)
            .then(() => {
                this.setState({ submitting: false });
            })
            .catch(() => {
                this.setState({ submitting: false });
            });
    };

    renderTypeSpecificFields = (): JSX.Element | null => {
        const { selectedType } = this.state;

        if (!selectedType) return null;

        const commonFields = (
            <>
                <Form.Item
                    label="Host"
                    name="host"
                    rules={[
                        {
                            required: [
                                ConnectionConnTypeEnum.Database,
                                ConnectionConnTypeEnum.Ftp,
                                ConnectionConnTypeEnum.Sftp,
                            ].includes(selectedType),
                            message: "Host is required for this connection type",
                        },
                    ]}
                >
                    <Input placeholder="localhost, database.example.com, etc." />
                </Form.Item>
                <Form.Item label="Port" name="port">
                    <Input placeholder="3306, 5432, 21, 22, etc." />
                </Form.Item>
                <Form.Item label="Username/Login" name="login">
                    <Input placeholder="Username or login credential" />
                </Form.Item>
                <Form.Item label="Password" name="password">
                    <Input.Password placeholder="Password (leave empty to keep existing)" />
                </Form.Item>
            </>
        );

        let typeSpecificInfo = null;
        switch (selectedType) {
            case ConnectionConnTypeEnum.Database:
                typeSpecificInfo = (
                    <Text type="secondary">
                        For databases, you can specify database type, database name, and connection parameters in the
                        Extra field.
                        <br />
                        Example: {`{"database_type": "postgresql", "database": "myapp"}`}
                    </Text>
                );
                break;
            case ConnectionConnTypeEnum.S3:
                typeSpecificInfo = (
                    <Text type="secondary">
                        For S3 connections, login/password should be Access Key ID/Secret Access Key.
                        <br />
                        Example Extra: {`{"region": "us-east-1", "endpoint_url": "https://s3.amazonaws.com"}`}
                    </Text>
                );
                break;
            case ConnectionConnTypeEnum.Http:
            case ConnectionConnTypeEnum.Webhook:
                typeSpecificInfo = (
                    <Text type="secondary">
                        For HTTP/Webhook connections, you can specify authentication and headers in Extra.
                        <br />
                        Example: {`{"auth_type": "bearer", "headers": {"Authorization": "Bearer token"}}`}
                    </Text>
                );
                break;
        }

        return (
            <div className="connection-type-specific-fields">
                <Title level={5}>Connection Details</Title>
                {typeSpecificInfo && (
                    <>
                        {typeSpecificInfo}
                        <Divider />
                    </>
                )}
                <Row gutter={16}>
                    <Col span={12}>{commonFields}</Col>
                    <Col span={12}>
                        <Form.Item
                            label="Extra Configuration"
                            name="extra"
                            rules={[{ validator: this.validateExtraJson }]}
                            help={this.state.extraJsonError}
                            validateStatus={this.state.extraJsonError ? "error" : ""}
                        >
                            <TextArea
                                rows={6}
                                placeholder='Additional configuration as JSON (optional)&#10;{&#10;  "key": "value"&#10;}'
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </div>
        );
    };

    render(): JSX.Element {
        const { isEdit, onCancel } = this.props;
        const { submitting } = this.state;

        return (
            <Form ref={this.formRef} layout="vertical" onFinish={this.handleSubmit} className="connection-form">
                <Form.Item
                    label="Connection Name"
                    name="name"
                    rules={[
                        { required: true, message: "Please enter a connection name" },
                        { min: 1, max: 255, message: "Name must be between 1 and 255 characters" },
                    ]}
                >
                    <Input placeholder="My Database Connection" />
                </Form.Item>

                <Form.Item
                    label="Connection Type"
                    name="conn_type"
                    rules={[{ required: true, message: "Please select a connection type" }]}
                >
                    <Select placeholder="Select connection type" onChange={this.handleTypeChange}>
                        {Object.values(ConnectionConnTypeEnum).map((type) => (
                            <Option key={type} value={type}>
                                {ConnectionTypeLabels[type]}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                {this.renderTypeSpecificFields()}

                <Divider />

                <Form.Item className="mb-0">
                    <Space className="w-full justify-end">
                        <Button onClick={onCancel}>Cancel</Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={submitting}
                            className="bg-estela border-estela hover:bg-estela-blue hover:border-estela-blue"
                        >
                            {isEdit ? "Update Connection" : "Create Connection"}
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        );
    }
}
