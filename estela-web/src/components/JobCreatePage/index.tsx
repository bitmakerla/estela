import React, { Component, Fragment } from "react";
import { Button, Form, Input, Layout, Typography, Space, Tag, Switch, DatePicker, DatePickerProps } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import { RouteComponentProps } from "react-router-dom";
import moment from "moment";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsSpidersReadRequest,
    ApiProjectsSpidersJobsCreateRequest,
    SpiderJobCreate,
    Spider,
} from "../../services/api";
import {
    authNotification,
    incorrectDataNotification,
    invalidDataNotification,
    resourceNotAllowedNotification,
    Header,
    ProjectSidenav,
} from "../../shared";

const { Content } = Layout;
const { Title } = Typography;

interface ArgsData {
    name: string;
    value: string;
    key: number;
}

interface EnvVarsData {
    name: string;
    value: string;
    key: number;
}

interface TagsData {
    name: string;
    key: number;
}

interface JobCreatePageState {
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    newTagName: string;
    spiderName: string;
    isDataPersistent: boolean;
    dataExpiryDays: string;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
}

export class JobCreatePage extends Component<RouteComponentProps<RouteParams>, JobCreatePageState> {
    apiService = ApiService();
    state: JobCreatePageState = {
        args: [],
        envVars: [],
        tags: [],
        newArgName: "",
        newArgValue: "",
        newEnvVarName: "",
        newEnvVarValue: "",
        newTagName: "",
        spiderName: "",
        isDataPersistent: true,
        dataExpiryDays: moment().add(1, "months").format("YYYY-MM-DD"),
    };
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    countKey = 0;

    componentDidMount(): void {
        if (!AuthService.getAuthToken()) {
            authNotification();
        }
        const requestParams: ApiProjectsSpidersReadRequest = { pid: this.projectId, sid: parseInt(this.spiderId) };
        this.apiService.apiProjectsSpidersRead(requestParams).then(
            async (response: Spider) => {
                this.setState({ spiderName: response.name });
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    }

    handleSubmit = (): void => {
        const requestData = {
            args: [...this.state.args],
            envVars: [...this.state.envVars],
            tags: [...this.state.tags],
            dataStatus: this.state.isDataPersistent ? `PERSISTENT` : `PENDING`,
            dataExpiryDays: this.state.dataExpiryDays,
        };
        const request: ApiProjectsSpidersJobsCreateRequest = {
            data: requestData,
            pid: this.projectId,
            sid: this.spiderId,
        };
        this.apiService.apiProjectsSpidersJobsCreate(request).then(
            (response: SpiderJobCreate) => {
                history.push(`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${response.jid}`);
            },
            (error: unknown) => {
                console.error(error);
                incorrectDataNotification();
            },
        );
    };

    handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newArgName") {
            this.setState({ newArgName: value });
        } else if (name === "newArgValue") {
            this.setState({ newArgValue: value });
        } else if (name === "newEnvVarName") {
            this.setState({ newEnvVarName: value });
        } else if (name === "newEnvVarValue") {
            this.setState({ newEnvVarValue: value });
        } else if (name === "newTagName") {
            this.setState({ newTagName: value });
        }
    };

    handleRemoveArg = (id: number): void => {
        const args = [...this.state.args];
        args.splice(id, 1);
        this.setState({ args: [...args] });
    };

    handleRemoveEnvVar = (id: number): void => {
        const envVars = [...this.state.envVars];
        envVars.splice(id, 1);
        this.setState({ envVars: [...envVars] });
    };

    handleRemoveTag = (id: number): void => {
        const tags = [...this.state.tags];
        tags.splice(id, 1);
        this.setState({ tags: [...tags] });
    };

    addArgument = (): void => {
        const args = [...this.state.args];
        const newArgName = this.state.newArgName.trim();
        const newArgValue = this.state.newArgValue.trim();
        if (newArgName && newArgValue && newArgName.indexOf(" ") == -1) {
            args.push({ name: newArgName, value: newArgValue, key: this.countKey++ });
            this.setState({ args: [...args], newArgName: "", newArgValue: "" });
        } else {
            invalidDataNotification("Invalid argument name/value pair.");
        }
    };

    addEnvironmentVariable = (): void => {
        const envVars = [...this.state.envVars];
        const newEnvVarName = this.state.newEnvVarName.trim();
        const newEnvVarValue = this.state.newEnvVarValue.trim();
        if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
            envVars.push({ name: newEnvVarName, value: newEnvVarValue, key: this.countKey++ });
            this.setState({ envVars: [...envVars], newEnvVarName: "", newEnvVarValue: "" });
        } else {
            invalidDataNotification("Invalid environment variable name/value pair.");
        }
    };

    addTag = (): void => {
        const tags = [...this.state.tags];
        const newTagName = this.state.newTagName.trim();
        if (newTagName && newTagName.indexOf(" ") == -1) {
            tags.push({ name: newTagName, key: this.countKey++ });
            this.setState({ tags: [...tags], newTagName: "" });
        } else {
            invalidDataNotification("Invalid tag name.");
        }
    };

    onChangeData = (): void => {
        this.setState({ isDataPersistent: !this.state.isDataPersistent });
    };

    disabledDate: RangePickerProps["disabledDate"] = (current) => {
        return current && current < moment().endOf("day");
    };

    onChangeDate: DatePickerProps["onChange"] = (_, dateString) => {
        this.setState({ dataExpiryDays: dateString });
    };

    render(): JSX.Element {
        const {
            args,
            envVars,
            tags,
            newArgName,
            newArgValue,
            newEnvVarName,
            newEnvVarValue,
            newTagName,
            spiderName,
            isDataPersistent,
            dataExpiryDays,
        } = this.state;

        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <Fragment>
                        <ProjectSidenav projectId={this.projectId} path={"/jobs"} />
                        <Content className="content-padding">
                            <Title level={2} className="text-center">
                                Run {spiderName} Job
                            </Title>
                            <Form className="project-create-form" onFinish={this.handleSubmit}>
                                <div className="arg-label">Arguments:</div>
                                <Space direction="vertical">
                                    {args.map((arg: ArgsData, id) => (
                                        <Tag closable key={arg.key} onClose={() => this.handleRemoveArg(id)}>
                                            {arg.name}: {arg.value}
                                        </Tag>
                                    ))}
                                    <div className="args">
                                        <Input
                                            name="newArgName"
                                            placeholder="name"
                                            value={newArgName}
                                            onChange={this.handleInputChange}
                                        />
                                        <Input
                                            name="newArgValue"
                                            placeholder="value"
                                            value={newArgValue}
                                            onChange={this.handleInputChange}
                                        />
                                    </div>
                                </Space>
                                <Button className="job-create-button" onClick={this.addArgument}>
                                    Save Argument
                                </Button>
                                <div className="envVar-label">Environment variables:</div>
                                <Space direction="vertical">
                                    {envVars.map((envVar: EnvVarsData, id) => (
                                        <Tag closable key={envVar.key} onClose={() => this.handleRemoveEnvVar(id)}>
                                            {envVar.name}: {envVar.value}
                                        </Tag>
                                    ))}
                                    <div className="envVars">
                                        <Input
                                            name="newEnvVarName"
                                            placeholder="name"
                                            value={newEnvVarName}
                                            onChange={this.handleInputChange}
                                        />
                                        <Input
                                            name="newEnvVarValue"
                                            placeholder="value"
                                            value={newEnvVarValue}
                                            onChange={this.handleInputChange}
                                        />
                                    </div>
                                </Space>
                                <Button className="job-create-button" onClick={this.addEnvironmentVariable}>
                                    Save Environment Variable
                                </Button>
                                <div className="tag-label">Tags:</div>
                                <Space direction="vertical">
                                    <Space direction="horizontal">
                                        {tags.map((tag: TagsData, id) => (
                                            <Tag closable key={tag.key} onClose={() => this.handleRemoveTag(id)}>
                                                {tag.name}
                                            </Tag>
                                        ))}
                                    </Space>
                                    <div className="tags">
                                        <Input
                                            name="newTagName"
                                            placeholder="name"
                                            value={newTagName}
                                            onChange={this.handleInputChange}
                                        />
                                    </div>
                                </Space>
                                <Button className="job-create-button" onClick={this.addTag}>
                                    Save Tag
                                </Button>
                                <Space direction="vertical" size="large">
                                    <Space direction="horizontal">
                                        Save Data Permanently
                                        <Switch size="small" checked={isDataPersistent} onChange={this.onChangeData} />
                                    </Space>
                                    {!isDataPersistent && (
                                        <Space direction="horizontal">
                                            Date
                                            <DatePicker
                                                format="YYYY-MM-DD"
                                                onChange={this.onChangeDate}
                                                disabledDate={this.disabledDate}
                                                defaultValue={moment(dataExpiryDays)}
                                            />
                                        </Space>
                                    )}
                                </Space>
                                <div className="submitButton">
                                    <Button type="primary" htmlType="submit" className="job-create-button">
                                        Run Spider Job
                                    </Button>
                                </div>
                            </Form>
                        </Content>
                    </Fragment>
                </Layout>
            </Layout>
        );
    }
}
