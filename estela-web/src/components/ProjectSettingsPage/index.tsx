import React, { Component } from "react";
import { Button, Radio, Layout, Form, message, Typography, Row, Input, Select, Space } from "antd";
import type { RadioChangeEvent } from "antd";
import { RouteComponentProps, Link } from "react-router-dom";
import { EnvVarsSetting } from "../EnvVarsSettingsPage";

import "./styles.scss";
import history from "../../history";
import { ApiService } from "../../services";
import {
    ApiProjectsReadRequest,
    Project,
    ProjectUpdate,
    ProjectUpdatePermissionEnum,
    ProjectDataStatusEnum,
    ProjectUpdateDataStatusEnum,
    ProjectCategoryEnum,
    ApiProjectsUpdateRequest,
    ApiProjectsDeleteRequest,
    SpiderJobEnvVar,
} from "../../services/api";
import { resourceNotAllowedNotification } from "../../shared";
import { Permission } from "../../services/api/generated-api/models/Permission";
import { handleInvalidDataError } from "../../utils";

const { Content } = Layout;

interface ProjectSettingsPageState {
    name: string;
    user: string;
    users: Permission[];
    envVars: SpiderJobEnvVar[];
    loaded: boolean;
    newUser: string;
    permission: ProjectUpdatePermissionEnum;
    showModal: boolean;
    deletable: boolean;
    category: ProjectCategoryEnum | undefined;
    detailsChanged: boolean;
    persistenceChanged: boolean;
    persistenceValue: string;
    projectName: string;
    dataStatus: ProjectDataStatusEnum | undefined;
    newDataStatus: ProjectUpdateDataStatusEnum | undefined;
    dataExpiryDays: number | null | undefined;
}

interface RouteParams {
    projectId: string;
}

interface OptionData {
    label: string;
    key: number;
    value: number;
}

export class ProjectSettingsPage extends Component<RouteComponentProps<RouteParams>, ProjectSettingsPageState> {
    state: ProjectSettingsPageState = {
        name: "",
        user: "",
        users: [],
        envVars: [],
        loaded: false,
        newUser: "",
        permission: ProjectUpdatePermissionEnum.Viewer,
        showModal: false,
        deletable: false,
        detailsChanged: false,
        persistenceChanged: false,
        persistenceValue: "",
        dataStatus: undefined,
        newDataStatus: undefined,
        dataExpiryDays: 1,
        projectName: "",
        category: undefined,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    closeModal = (): void => {
        this.setState({ showModal: false });
    };

    openModal = (): void => {
        this.setState({ showModal: true });
    };

    updateInfo = (): void => {
        const requestParams: ApiProjectsReadRequest = { pid: this.projectId };
        this.apiService.apiProjectsRead(requestParams).then(
            (response: Project) => {
                let envVars = response.envVars || [];
                const users = response.users || [];

                envVars = envVars.map((envVar: SpiderJobEnvVar) => {
                    return {
                        name: envVar.name,
                        value: envVar.masked ? "__MASKED__" : envVar.value,
                        masked: envVar.masked,
                    };
                });

                this.setState({
                    name: response.name,
                    projectName: response.name,
                    users: [...users],
                    dataStatus: response.dataStatus,
                    dataExpiryDays: response.dataExpiryDays,
                    loaded: true,
                    envVars: [...envVars],
                    category: response.category,
                });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    async componentDidMount(): Promise<void> {
        this.updateInfo();
    }

    changeName = (): void => {
        const requestData: ProjectUpdate = {
            name: this.state.name,
        };
        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: this.projectId,
        };
        this.apiService.apiProjectsUpdate(request).then(
            () => {
                this.updateInfo();
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    changePersistence = (): void => {
        const requestData: ProjectUpdate = {
            dataStatus: this.state.newDataStatus,
            dataExpiryDays: Number(this.state.dataExpiryDays),
        };
        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: this.projectId,
        };
        this.apiService.apiProjectsUpdate(request).then(
            () => {
                this.updateInfo();
                message.success("Data persistence changed");
                this.setState({ persistenceChanged: false });
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    deleteProject = (): void => {
        const request: ApiProjectsDeleteRequest = {
            pid: this.projectId,
        };
        this.apiService.apiProjectsDelete(request).then(
            () => {
                history.push(`/projects`);
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    onPersistenceChange = (e: RadioChangeEvent): void => {
        this.setState({ persistenceChanged: true });
        if (e.target.value === 720) {
            this.setState({ newDataStatus: ProjectUpdateDataStatusEnum.Persistent });
        } else {
            this.setState({ newDataStatus: ProjectUpdateDataStatusEnum.Pending, dataExpiryDays: e.target.value });
        }
    };

    handleNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value },
        } = event;
        this.setState({ detailsChanged: true });
        this.setState({ name: value });
    };

    checkDeletable = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value },
        } = event;
        if (value === this.state.name) {
            this.setState({ deletable: true });
        } else {
            this.setState({ deletable: false });
        }
    };

    handleSelectChange = (value: ProjectUpdatePermissionEnum): void => {
        this.setState({ permission: value });
    };

    dataPersistenceOptions = [
        { label: "1 day", key: 1, value: 1 },
        { label: "1 week", key: 2, value: 7 },
        { label: "1 month", key: 3, value: 30 },
        { label: "3 months", key: 4, value: 90 },
        { label: "6 months", key: 5, value: 180 },
        { label: "1 year", key: 6, value: 365 },
        { label: "Forever", key: 7, value: 720 },
    ];

    projectCategoryOptions = [
        { label: "Not Specified", key: 1, value: ProjectCategoryEnum.NotEspecified },
        { label: "E-commerce", key: 2, value: ProjectCategoryEnum.ECommerce },
        { label: "Logistics", key: 3, value: ProjectCategoryEnum.Logistics },
        { label: "Finance", key: 4, value: ProjectCategoryEnum.Finance },
        { label: "Educational", key: 5, value: ProjectCategoryEnum.Educational },
        { label: "Technology", key: 6, value: ProjectCategoryEnum.Technology },
        { label: "Other Category", key: 7, value: ProjectCategoryEnum.OtherCategory },
    ];

    render(): JSX.Element {
        const {
            loaded,
            name,
            showModal,
            category,
            dataStatus,
            dataExpiryDays,
            detailsChanged,
            persistenceChanged,
            envVars,
        } = this.state;
        return (
            <Content className="bg-metal rounded-2xl">
                {loaded ? (
                    <div className="lg:m-10 md:mx-6 m-6">
                        <Row className="font-medium my-6">
                            <p className="text-xl text-silver">PROJECT SETTING</p>
                        </Row>
                        <Row className="bg-white rounded-lg">
                            <div className="lg:m-8 md:mx-6 m-4">
                                <p className="text-2xl text-estela-black-full ">Details</p>
                                <div className="bg-white my-4">
                                    <Content>
                                        <Form layout="vertical" className="w-96">
                                            <div className="">
                                                <Form.Item
                                                    label={
                                                        <div className="text-base text-estela-black-full">
                                                            Project Name
                                                        </div>
                                                    }
                                                    name="projectname"
                                                >
                                                    <Input
                                                        style={{ fontSize: 14, borderRadius: 8 }}
                                                        size="large"
                                                        placeholder={name}
                                                        onChange={this.handleNameChange}
                                                        className="border-estela placeholder:text-estela-black-full"
                                                    />
                                                </Form.Item>
                                                <Form.Item initialValue={category} label="Category" name="category">
                                                    <Select
                                                        style={{ fontSize: 14 }}
                                                        size="large"
                                                        className="border-estela"
                                                        placeholder="Select ..."
                                                        options={this.projectCategoryOptions}
                                                    />
                                                </Form.Item>
                                            </div>
                                            <div className="h-12 w-72">
                                                <Button
                                                    block
                                                    disabled={!detailsChanged}
                                                    htmlType="submit"
                                                    onClick={this.changeName}
                                                    className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base  min-h-full"
                                                >
                                                    <Link to={`/projects/${this.projectId}/dashboard`}>
                                                        Save Changes
                                                    </Link>
                                                </Button>
                                            </div>
                                        </Form>
                                    </Content>
                                </div>
                            </div>
                        </Row>
                        <Row className="bg-white rounded-lg my-4">
                            <Content className="lg:m-6 md:mx-6 m-4">
                                <p className="text-2xl text-black">Data persistence</p>
                                <p className="text-sm my-2 text-estela-black-medium">
                                    New projects you create will have this data persistence by default to retain data in
                                    &nbsp;
                                    <span className="font-bold text-estela-black-full text-base -ml-1">estela</span>
                                </p>
                                <Content>
                                    <Radio.Group
                                        defaultValue={
                                            dataStatus === ProjectDataStatusEnum.Persistent ? 720 : dataExpiryDays
                                        }
                                        onChange={this.onPersistenceChange}
                                        className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 lg:my-6 my-4"
                                    >
                                        {this.dataPersistenceOptions.map((option: OptionData) => (
                                            <Radio.Button className="text-sm" key={option.key} value={option.value}>
                                                {option.label}
                                            </Radio.Button>
                                        ))}
                                    </Radio.Group>
                                </Content>
                                <div className="h-12 w-72">
                                    <Button
                                        block
                                        disabled={!persistenceChanged}
                                        onClick={this.changePersistence}
                                        htmlType="submit"
                                        className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base  min-h-full"
                                    >
                                        Save changes
                                    </Button>
                                </div>
                            </Content>
                        </Row>
                        <EnvVarsSetting projectId={this.projectId} spiderId="" envVarsData={envVars} level="project" />
                        <Row className="bg-white rounded-lg">
                            <Space direction="vertical" className="lg:m-8 md:mx-6 m-4">
                                <Typography className="text-2xl text-black">Delete</Typography>
                                <Typography className="mb-2 text-sm text-estela-black-medium">
                                    This action cannot be undone
                                </Typography>
                                <div className="h-12 w-72">
                                    <Button
                                        block
                                        disabled={false}
                                        htmlType="submit"
                                        onClick={() => this.openModal()}
                                        className="border-estela-red-full bg-estela-red-full hover:border-estela-red-full hover:text-estela-red-full text-white rounded-md text-base min-h-full"
                                    >
                                        Delete Project
                                    </Button>
                                </div>
                            </Space>
                        </Row>
                        <div className="">
                            {showModal ? (
                                <>
                                    <Row className="inset-x-1/3 inset-y-1/3 lg:w-4/12 md:w-1/2 sm:w-1/2 align-middle items-center fixed z-50">
                                        <Layout className="bg-white align-middle object-center items-center text-center p-8 rounded-2xl">
                                            <Typography className="text-xl">CONFIRM ACTION</Typography>
                                            <Typography className="text-left text-base my-4">
                                                Enter the name of the project to delete it
                                            </Typography>
                                            <Space direction="vertical" className="bg-white w-full">
                                                <Form className="items-center align-middle">
                                                    <Form.Item name="deletingproject">
                                                        <p className="text-left text-base text-estela-black-full mb-2">
                                                            Project Name
                                                        </p>
                                                        <Input
                                                            onChange={this.checkDeletable}
                                                            placeholder={this.state.name}
                                                            className="h-12 rounded-lg border-2 border-estela"
                                                        />
                                                    </Form.Item>
                                                </Form>
                                            </Space>
                                            <Row className="grid grid-cols-2 w-full items-center bg-white">
                                                <div className="h-12 mr-2 align-middle">
                                                    <Button
                                                        block
                                                        disabled={!this.state.deletable}
                                                        htmlType="submit"
                                                        onClick={() => this.deleteProject()}
                                                        className="border-estela-red-full bg-estela-red-full hover:border-estela-red-full hover:text-estela-red-full text-white rounded-md text-base  min-h-full"
                                                    >
                                                        <Link to={`/`}>Delete</Link>
                                                    </Button>
                                                </div>
                                                <div className="h-12 ml-2 align-middle">
                                                    <Button
                                                        block
                                                        disabled={false}
                                                        htmlType="submit"
                                                        onClick={() => this.closeModal()}
                                                        className="border-estela bg-white hover:bg-estela hover:border-white hover:text-white text-estela rounded-md text-base  min-h-full"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </Row>
                                        </Layout>
                                    </Row>
                                    <div className="opacity-25 fixed inset-0 z-40 bg-black"></div>
                                </>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </Content>
        );
    }
}
