import React, { Component, Fragment } from "react";
import { Button, Form, Input, Layout, Typography, Space, Tag } from "antd";
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
    resourceNotAllowedNotification,
    Header,
    Sidenav,
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

interface CronJobCreatePageState {
    schedule: string;
    args: ArgsData[];
    envVars: EnvVarsData[];
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    spiderName: string;
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
        newArgName: "",
        newArgValue: "",
        newEnvVarName: "",
        newEnvVarValue: "",
        spiderName: "",
    };
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    countKey = 0;

    componentDidMount(): void {
        if (!AuthService.getAuthToken()) {
            authNotification();
        }
        const requestParams: ApiProjectsSpidersReadRequest = { pid: this.projectId, sid: this.spiderId };
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

    handleSubmit = (data: { schedule: string }): void => {
        const requestData = {
            cargs: [...this.state.args],
            cenvVars: [...this.state.envVars],
            schedule: data.schedule,
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

    addArgument = (): void => {
        const args = [...this.state.args];
        const newArgName = this.state.newArgName.trim();
        const newArgValue = this.state.newArgValue.trim();
        if (newArgName && newArgValue && newArgName.indexOf(" ") == -1) {
            args.push({ name: newArgName, value: newArgValue, key: this.countKey++ });
            this.setState({ args: [...args], newArgName: "", newArgValue: "" });
        } else {
            incorrectDataNotification();
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
            incorrectDataNotification();
        }
    };

    render(): JSX.Element {
        const { args, envVars, newArgName, newArgValue, newEnvVarName, newEnvVarValue, spiderName } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <Fragment>
                        <Sidenav />
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
