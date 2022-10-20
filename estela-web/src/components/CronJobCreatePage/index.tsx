import React, { Component, Fragment } from "react";
import { Button, Form, Input, Checkbox, Layout, Typography, Space, Tag, Switch, InputNumber } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsSpidersReadRequest,
    ApiProjectsSpidersCronjobsCreateRequest,
    SpiderCronJobCreate,
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

interface CronJobCreatePageState {
    schedule: string;
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    newTagName: string;
    spiderName: string;
    uniqueCollection: boolean;
    isDataPersistent: boolean;
    days: number;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
}

export class CronJobCreatePage extends Component<RouteComponentProps<RouteParams>, CronJobCreatePageState> {
    apiService = ApiService();
    state: CronJobCreatePageState = {
        schedule: "",
        args: [],
        envVars: [],
        tags: [],
        newArgName: "",
        newArgValue: "",
        newEnvVarName: "",
        newEnvVarValue: "",
        newTagName: "",
        spiderName: "",
        uniqueCollection: false,
        isDataPersistent: true,
        days: 1,
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

    handleSubmit = (data: { schedule: string; unique_collection: boolean }): void => {
        const requestData = {
            cargs: [...this.state.args],
            cenvVars: [...this.state.envVars],
            ctags: [...this.state.tags],
            schedule: data.schedule,
            uniqueCollection: data.unique_collection,
            dataStatus: this.state.isDataPersistent ? `PERSISTENT` : `PENDING`,
            dataExpiryDays: `0/${this.state.days}`,
        };
        const request: ApiProjectsSpidersCronjobsCreateRequest = {
            data: requestData,
            pid: this.projectId,
            sid: this.spiderId,
        };
        this.apiService.apiProjectsSpidersCronjobsCreate(request).then(
            (response: SpiderCronJobCreate) => {
                history.push(`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/${response.cjid}`);
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

    onChangeDay = (value: number): void => {
        this.setState({ days: value });
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
            days,
        } = this.state;

        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <Fragment>
                        <ProjectSidenav projectId={this.projectId} path={"/jobs"} />
                        <Content className="content-padding">
                            <Title level={2} className="text-center">
                                Create {spiderName} CronJob
                            </Title>
                            <Form className="project-create-form" onFinish={this.handleSubmit}>
                                <Form.Item
                                    label="Schedule"
                                    name="schedule"
                                    required
                                    rules={[{ required: true, message: "Please input cronjob schedule" }]}
                                >
                                    <Input />
                                </Form.Item>
                                <div className="cronjobs-info">
                                    More information about cron schedule expressions&nbsp;
                                    <a href="https://crontab.guru/" target="_blank" rel="noreferrer">
                                        here
                                    </a>
                                </div>
                                <Form.Item name="unique_collection" valuePropName="checked">
                                    <Checkbox>Unique Collection</Checkbox>
                                </Form.Item>
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
                                            Days
                                            <InputNumber
                                                size="small"
                                                min={1}
                                                max={31}
                                                defaultValue={days}
                                                onChange={this.onChangeDay}
                                            />
                                        </Space>
                                    )}
                                </Space>
                                <Button type="primary" htmlType="submit" className="job-create-button">
                                    Create CronJob
                                </Button>
                            </Form>
                        </Content>
                    </Fragment>
                </Layout>
            </Layout>
        );
    }
}
