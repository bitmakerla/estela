import React, { Component, Fragment } from "react";
import { Button, Form, Input, Layout, Typography, Select, Space, Tag } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsSpidersReadRequest,
    ApiProjectsSpidersJobsCreateRequest,
    SpiderJobCreate,
    Spider,
    SpiderJobCreateJobTypeEnum,
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
const { Option } = Select;

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

interface JobCreatePageState {
    args: ArgsData[];
    envVars: EnvVarsData[];
    type: string | undefined;
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    spiderName: string;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    jobId: string;
}

export class JobCreatePage extends Component<RouteComponentProps<RouteParams>, JobCreatePageState> {
    apiService = ApiService();
    singleJob = "SINGLE_JOB";
    cronJob = "CRON_JOB";
    state: JobCreatePageState = {
        args: [],
        envVars: [],
        type: this.singleJob,
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

    handleSubmit = (data: { type: string; schedule: string }): void => {
        const requestData = {
            args: [...this.state.args],
            envVars: [...this.state.envVars],
            jobType: SpiderJobCreateJobTypeEnum.SingleJob,
            schedule: "",
        };
        if (data.type === this.cronJob) {
            requestData.jobType = SpiderJobCreateJobTypeEnum.CronJob;
            requestData.schedule = data.schedule;
        }
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
        }
    };

    handleSelectChange = (type: string): void => {
        this.setState({ type });
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
        const { args, envVars, type, newArgName, newArgValue, newEnvVarName, newEnvVarValue, spiderName } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <Fragment>
                        <Sidenav />
                        <Content className="content-padding">
                            <Title level={2} className="text-center">
                                Run {spiderName} Job
                            </Title>
                            <Form className="project-create-form" onFinish={this.handleSubmit}>
                                <Form.Item
                                    label="Job Type"
                                    name="type"
                                    required
                                    rules={[{ required: true, message: "Please input job type" }]}
                                >
                                    <Select style={{ width: 200 }} onChange={this.handleSelectChange}>
                                        <Option value={this.singleJob}>SingleJob</Option>
                                        <Option value={this.cronJob}>CronJob</Option>
                                    </Select>
                                </Form.Item>
                                {type === this.cronJob && (
                                    <Fragment>
                                        <Form.Item
                                            label="Schedule"
                                            name="schedule"
                                            required
                                            rules={[{ required: true, message: "Please input job schedule" }]}
                                        >
                                            <Input />
                                        </Form.Item>
                                        <div className="cronjobs-info">
                                            More information about cron schedule expressions&nbsp;
                                            <a href="https://crontab.guru/" target="_blank" rel="noreferrer">
                                                here
                                            </a>
                                        </div>
                                    </Fragment>
                                )}
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
                                    Run Spider Job
                                </Button>
                            </Form>
                        </Content>
                    </Fragment>
                </Layout>
            </Layout>
        );
    }
}
