import React, { Component } from "react";
import {
    Button,
    Radio,
    Layout,
    Form,
    message,
    Typography,
    Row,
    Col,
    Input,
    Select,
    Space,
    Checkbox,
    Modal,
    Card,
} from "antd";
import type { RadioChangeEvent } from "antd";
import { PlusOutlined, DeleteOutlined, CheckCircleFilled } from "@ant-design/icons";
import { RouteComponentProps, Link } from "react-router-dom";

import { EnvVarsSetting } from "../../components/EnvVarsSettingsPage";
import { ProxySettings } from "../../components/ProxySettingsPage";

import "./styles.scss";
import history from "../../history";
import { ApiService } from "../../services";
import {
    ApiProjectsReadRequest,
    ApiProjectsResourceTiersAvailableRequest,
    ApiProjectsResourceTiersCreateRequest,
    ApiProjectsResourceTiersDeleteRequest,
    Project,
    ProjectUpdate,
    ProjectUpdatePermissionEnum,
    ProjectDataStatusEnum,
    ProjectUpdateDataStatusEnum,
    ProjectCategoryEnum,
    ApiProjectsUpdateRequest,
    ApiProjectsDeleteRequest,
    SpiderJobEnvVar,
    ResourceTier,
} from "../../services/api";
import { resourceNotAllowedNotification } from "../../shared";
import { DEFAULT_RESOURCE_TIER } from "../../constants";
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
    applyToExistingSpiders: boolean;
    availableTiers: ResourceTier[];
    defaultResourceTier: string;
    showTierModal: boolean;
    newTierName: string;
    newTierCpuRequest: string;
    newTierCpuLimit: string;
    newTierMemRequest: string;
    newTierMemLimit: string;
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
        applyToExistingSpiders: false,
        availableTiers: [],
        defaultResourceTier: DEFAULT_RESOURCE_TIER,
        showTierModal: false,
        newTierName: "",
        newTierCpuRequest: "",
        newTierCpuLimit: "",
        newTierMemRequest: "",
        newTierMemLimit: "",
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
                    defaultResourceTier: response.defaultResourceTier || "SMALL",
                });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    fetchTiers = (): void => {
        const tiersParams: ApiProjectsResourceTiersAvailableRequest = { pid: this.projectId };
        this.apiService.apiProjectsResourceTiersAvailable(tiersParams).then(
            (tiers: ResourceTier[]) => {
                this.setState({ availableTiers: tiers });
            },
            (error: unknown) => {
                error;
            },
        );
    };

    changeDefaultTier = (tierName: string): void => {
        const requestData: ProjectUpdate = {
            defaultResourceTier: tierName,
        };
        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: this.projectId,
        };
        this.apiService.apiProjectsUpdate(request).then(
            () => {
                this.setState({ defaultResourceTier: tierName });
                message.success(`Default tier changed to ${tierName}`);
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    createCustomTier = (): void => {
        const { newTierName, newTierCpuRequest, newTierCpuLimit, newTierMemRequest, newTierMemLimit } = this.state;
        if (!newTierName || !newTierCpuRequest || !newTierCpuLimit || !newTierMemRequest || !newTierMemLimit) {
            message.error("All fields are required");
            return;
        }
        const request: ApiProjectsResourceTiersCreateRequest = {
            pid: this.projectId,
            data: {
                name: newTierName,
                cpuRequest: `${newTierCpuRequest}m`,
                cpuLimit: `${newTierCpuLimit}m`,
                memRequest: `${newTierMemRequest}Mi`,
                memLimit: `${newTierMemLimit}Mi`,
            },
        };
        this.apiService.apiProjectsResourceTiersCreate(request).then(
            () => {
                message.success(`Custom tier "${newTierName}" created`);
                this.setState({
                    showTierModal: false,
                    newTierName: "",
                    newTierCpuRequest: "",
                    newTierCpuLimit: "",
                    newTierMemRequest: "",
                    newTierMemLimit: "",
                });
                this.fetchTiers();
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    deleteCustomTier = (tierId: number, tierName: string): void => {
        const request: ApiProjectsResourceTiersDeleteRequest = {
            pid: this.projectId,
            id: tierId,
        };
        this.apiService.apiProjectsResourceTiersDelete(request).then(
            () => {
                message.success(`Tier "${tierName}" deleted`);
                this.fetchTiers();
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    async componentDidMount(): Promise<void> {
        this.updateInfo();
        this.fetchTiers();
    }

    async componentDidUpdate(
        prevProps: Readonly<RouteComponentProps>,
        prevState: Readonly<ProjectSettingsPageState>,
    ): Promise<void> {
        if (prevState.envVars !== this.state.envVars) {
            this.updateProjectEnvVars();
        }
    }

    updateProjectEnvVars = (): void => {
        const requestData: ProjectUpdate = {
            envVars: this.state.envVars,
        };
        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: this.projectId,
        };
        this.apiService.apiProjectsUpdate(request).then((error: unknown) => {
            handleInvalidDataError(error);
        });
    };

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
            applyToExistingSpiders: this.state.applyToExistingSpiders,
        };
        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: this.projectId,
        };
        this.apiService.apiProjectsUpdate(request).then(
            () => {
                this.updateInfo();
                const successMessage = this.state.applyToExistingSpiders
                    ? "Data persistence changed and applied to all existing spiders"
                    : "Data persistence changed";
                message.success(successMessage);
                this.setState({ persistenceChanged: false, applyToExistingSpiders: false });
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

    handleApplyToExistingSpiders = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ applyToExistingSpiders: e.target.checked });
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
        { label: "Not Specified", key: 1, value: ProjectCategoryEnum.NotSpecified },
        { label: "E-commerce", key: 2, value: ProjectCategoryEnum.ECommerce },
        { label: "Logistics", key: 3, value: ProjectCategoryEnum.Logistics },
        { label: "Finance", key: 4, value: ProjectCategoryEnum.Finance },
        { label: "Educational", key: 5, value: ProjectCategoryEnum.Educational },
        { label: "Technology", key: 6, value: ProjectCategoryEnum.Technology },
        { label: "Other Category", key: 7, value: ProjectCategoryEnum.OtherCategory },
    ];

    updateEnvVars = (envVars: SpiderJobEnvVar[]): void => {
        this.setState({ envVars: envVars });
    };

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
            availableTiers,
            defaultResourceTier,
            showTierModal,
        } = this.state;
        return (
            <Content className="bg-metal rounded-2xl">
                {loaded ? (
                    <div className="lg:m-10 md:mx-6 m-6">
                        <Row className="font-medium my-6">
                            <p className="text-xl text-silver">PROJECT SETTINGS</p>
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
                                <div className="mt-2 mb-6 p-3 border-t border-gray-100">
                                    <Checkbox
                                        onChange={this.handleApplyToExistingSpiders}
                                        checked={this.state.applyToExistingSpiders}
                                        className="text-base text-estela-black-full"
                                    >
                                        <span className="ml-2 font-medium">Apply to all existing spiders</span>
                                    </Checkbox>
                                </div>
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
                        <Row className="bg-white rounded-lg my-4">
                            <div className="lg:m-8 md:mx-6 m-4 w-full">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-2xl text-estela-black-full">Resource Tiers</p>
                                    <Button icon={<PlusOutlined />} disabled className="flex items-center rounded-md">
                                        Add Custom Tier
                                    </Button>
                                </div>
                                <p className="text-sm text-estela-black-medium mb-4">
                                    Click on a tier to set it as the default for new jobs in this project.
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {availableTiers.map((tier: ResourceTier) => {
                                        const isDefault = tier.name === defaultResourceTier;
                                        const isCustom = tier.id !== null && tier.id !== undefined;
                                        return (
                                            <Card
                                                key={tier.name}
                                                size="small"
                                                className={`cursor-pointer transition-all ${
                                                    isDefault
                                                        ? "border-2 border-estela bg-estela-blue-low"
                                                        : "border border-gray-200 hover:border-estela"
                                                }`}
                                                onClick={() => this.changeDefaultTier(tier.name)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <p className="font-semibold text-base text-estela-black-full">
                                                        {tier.name}
                                                    </p>
                                                    <div className="flex items-center gap-1">
                                                        {isDefault && <CheckCircleFilled className="text-estela" />}
                                                        {isCustom && (
                                                            <Button
                                                                type="text"
                                                                size="small"
                                                                icon={<DeleteOutlined className="text-red-500" />}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    this.deleteCustomTier(tier.id as number, tier.name);
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                                    <div>
                                                        MEM: {tier.memRequest} / {tier.memLimit}
                                                    </div>
                                                    <div>
                                                        CPU: {tier.cpuRequest} / {tier.cpuLimit}
                                                    </div>
                                                </div>
                                                {isDefault && (
                                                    <div className="mt-1">
                                                        <span className="text-xs font-medium text-estela">Default</span>
                                                    </div>
                                                )}
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        </Row>
                        <Modal
                            open={showTierModal}
                            title="Add Custom Tier"
                            onCancel={() => this.setState({ showTierModal: false })}
                            onOk={this.createCustomTier}
                            okText="Create"
                            okButtonProps={{
                                className: "bg-estela border-estela text-white",
                            }}
                        >
                            <Form layout="vertical">
                                <Form.Item label="Name">
                                    <Input
                                        value={this.state.newTierName}
                                        onChange={(e) => this.setState({ newTierName: e.target.value })}
                                        placeholder="e.g. MY_CUSTOM"
                                    />
                                </Form.Item>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item label="CPU Request (millicores)">
                                            <Input
                                                type="number"
                                                value={this.state.newTierCpuRequest}
                                                onChange={(e) => this.setState({ newTierCpuRequest: e.target.value })}
                                                placeholder="e.g. 256"
                                                suffix="m"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="CPU Limit (millicores)">
                                            <Input
                                                type="number"
                                                value={this.state.newTierCpuLimit}
                                                onChange={(e) => this.setState({ newTierCpuLimit: e.target.value })}
                                                placeholder="e.g. 512"
                                                suffix="m"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item label="Memory Request (MiB)">
                                            <Input
                                                type="number"
                                                value={this.state.newTierMemRequest}
                                                onChange={(e) => this.setState({ newTierMemRequest: e.target.value })}
                                                placeholder="e.g. 384"
                                                suffix="Mi"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Memory Limit (MiB)">
                                            <Input
                                                type="number"
                                                value={this.state.newTierMemLimit}
                                                onChange={(e) => this.setState({ newTierMemLimit: e.target.value })}
                                                placeholder="e.g. 512"
                                                suffix="Mi"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Form>
                        </Modal>
                        <EnvVarsSetting projectId={this.projectId} spiderId="" envVarsData={envVars} level="project" />
                        <ProxySettings envVars={envVars} setEnvVars={this.updateEnvVars} />
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
