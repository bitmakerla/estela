import React, { Component, ReactElement } from "react";
import {
    Layout,
    Pagination,
    // Typography,
    Row,
    Space,
    Table,
    Modal,
    Col,
    Button,
    Input,
    Form,
    Switch,
    Select,
    Tag,
    Checkbox,
} from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ReactComponent as Add } from "../../assets/icons/add.svg";
import {
    ApiProjectsReadRequest,
    ApiProjectsCronjobsRequest,
    Project,
    ProjectCronJob,
    SpiderCronJob,
    SpiderCronJobStatusEnum,
} from "../../services/api";
import {
    authNotification,
    resourceNotAllowedNotification,
    invalidDataNotification,
    Header,
    ProjectSidenav,
    Spin,
} from "../../shared";
import { convertDateToString } from "../../utils";

const { Option } = Select;
const { Content } = Layout;
// const { Title, Text } = Typography;

interface Ids {
    sid: number | undefined;
    cid: number | undefined;
}

interface TagsData {
    name: string;
}

interface SpiderCronJobData {
    id: Ids;
    key: number | undefined;
    date: string;
    status: string | undefined;
    schedule: string | undefined;
    dataExpiryDays: number | undefined | null;
    tags: TagsData[] | undefined;
}

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

interface ProjectCronJobListPageState {
    name: string;
    cronjobs: SpiderCronJobData[];
    loaded: boolean;
    modal: boolean;
    count: number;
    current: number;
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    newTagName: string;
}

interface RouteParams {
    projectId: string;
}

export class ProjectCronJobListPage extends Component<RouteComponentProps<RouteParams>, ProjectCronJobListPageState> {
    PAGE_SIZE = 10;
    state: ProjectCronJobListPageState = {
        name: "",
        args: [],
        envVars: [],
        tags: [],
        newArgName: "",
        newArgValue: "",
        newEnvVarName: "",
        newEnvVarValue: "",
        newTagName: "",
        cronjobs: [],
        loaded: false,
        modal: true,
        count: 0,
        current: 0,
    };

    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    countKey = 0;

    columns = [
        {
            title: "ENABLED",
            key: "status",
            dataIndex: "status",
            render: (status: string | undefined) => {
                return (
                    <Switch
                        size="small"
                        className="bg-estela-white-low"
                        defaultChecked={status === SpiderCronJobStatusEnum.Active}
                        // onChange={this.handleSwitchChange}
                    />
                );
            },
        },
        {
            title: "SCHEDULED JOB",
            dataIndex: "id",
            key: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}/cronjobs/${id.cid}`}>{id.cid}</Link>
            ),
        },
        {
            title: "SPIDER ID",
            dataIndex: "id",
            key: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}`}>{id.sid}</Link>
            ),
        },
        {
            title: "EXPRESSION",
            key: "schedule",
            dataIndex: "schedule",
        },
        {
            title: "Tags",
            key: "tags",
            dataIndex: "tags",
            render: (tags: TagsData[]): ReactElement => (
                <Space direction="horizontal">
                    {tags.map((tag: TagsData, id) => (
                        <Tag key={id} className="text-estela border-estela rounded bg-button-hover">
                            {tag.name}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: "PERSISTENCE",
            key: "dataExpiryDays",
            dataIndex: "dataExpiryDays",
            render: (dataExpiryDays: number | undefined): ReactElement => (
                <p>{dataExpiryDays ? dataExpiryDays : "No"}</p>
            ),
        },
    ];

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const requestParams: ApiProjectsReadRequest = { pid: this.projectId };
            this.apiService.apiProjectsRead(requestParams).then(
                (response: Project) => {
                    this.setState({ name: response.name });
                },
                (error: unknown) => {
                    console.error(error);
                    resourceNotAllowedNotification();
                },
            );
            this.getCronJobs(1);
        }
    }

    getCronJobs = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsCronjobsRequest = {
            pid: this.projectId,
            page,
            pageSize: this.PAGE_SIZE,
        };

        await this.apiService.apiProjectsCronjobs(requestParams).then((response: ProjectCronJob) => {
            console.log(response.results);
            const data = response.results.map((cronjob: SpiderCronJob, iterator: number) => ({
                key: iterator,
                id: { sid: cronjob.spider, cid: cronjob.cjid },
                date: convertDateToString(cronjob.created),
                status: cronjob.status,
                schedule: cronjob.schedule,
                dataExpiryDays: cronjob.dataExpiryDays,
                tags: cronjob.ctags,
            }));
            const cronjobs: SpiderCronJobData[] = data;
            this.setState({ cronjobs: [...cronjobs], loaded: true, count: response.count, current: page });
        });
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

    addEnvVar = (): void => {
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
            tags.push({ name: newTagName });
            this.setState({ tags: [...tags], newTagName: "" });
        } else {
            invalidDataNotification("Invalid tag name.");
        }
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

    handleRemoveArg = (id: number): void => {
        const args = [...this.state.args];
        args.splice(id, 1);
        this.setState({ args: [...args] });
    };

    onPageChange = async (page: number): Promise<void> => {
        await this.getCronJobs(page);
    };

    render(): JSX.Element {
        const {
            loaded,
            cronjobs,
            modal,
            count,
            current,
            args,
            envVars,
            tags,
            newArgName,
            newArgValue,
            newEnvVarName,
            newEnvVarValue,
            newTagName,
        } = this.state;
        return (
            <Layout>
                <Header />
                <Layout className="bg-white">
                    <ProjectSidenav projectId={this.projectId} path={"/cronjobs"} />
                    <Content className="bg-metal rounded-2xl">
                        {loaded ? (
                            <Layout className="white-background">
                                <Content className="bg-metal rounded-2xl">
                                    <div className="lg:m-10 md:mx-6 mx-2">
                                        <Row className="flow-root my-6">
                                            <Col className="float-left">
                                                <p className="text-xl font-medium text-silver float-left">
                                                    PROJECT MEMBERS
                                                </p>
                                            </Col>
                                            <Col className="float-right">
                                                <Button
                                                    icon={<Add className="mr-2" width={19} />}
                                                    size="large"
                                                    className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                                    onClick={() => this.setState({ modal: true })}
                                                >
                                                    Schedule new job
                                                </Button>
                                                <Modal
                                                    style={{
                                                        overflow: "hidden",
                                                        padding: 0,
                                                    }}
                                                    width={900}
                                                    visible={modal}
                                                    title={
                                                        <p className="text-xl text-center my-2 font-normal">
                                                            NEW SCHEDULED JOB
                                                        </p>
                                                    }
                                                    onCancel={() => this.setState({ modal: false })}
                                                    footer={null}
                                                >
                                                    <div className="lg:mx-2 md:mx-1">
                                                        <Row className="grid grid-cols-2 sm:grid-cols-2">
                                                            <Col className="bg-red-100">
                                                                <div className="mx-4">
                                                                    <Form>
                                                                        <p>Spider</p>
                                                                        <Select
                                                                            size="large"
                                                                            className="w-full"
                                                                            defaultValue={"spider2"}
                                                                        >
                                                                            <Option value={"spide1"}>Spider 1</Option>
                                                                            <Option value={"spide2"}>Spider 2</Option>
                                                                            <Option value={"spide3"}>Spider 3</Option>
                                                                        </Select>
                                                                        <Form.Item
                                                                            // label="Data persistence"
                                                                            // name="persistence"
                                                                            required
                                                                            rules={[
                                                                                {
                                                                                    required: true,
                                                                                    message:
                                                                                        "Please input Data persistence!",
                                                                                },
                                                                            ]}
                                                                        >
                                                                            <p>Data persistence</p>
                                                                            <Input
                                                                                size="large"
                                                                                className="border-estela-blue-full rounded-lg"
                                                                            />
                                                                        </Form.Item>
                                                                        <Form.Item
                                                                            name="unique_collection"
                                                                            valuePropName="checked"
                                                                        >
                                                                            <Checkbox>Unique Collection</Checkbox>
                                                                        </Form.Item>
                                                                        <Form.Item>
                                                                            <p>Arguments</p>
                                                                            <Space direction="vertical">
                                                                                {args.map((arg: ArgsData, id) => (
                                                                                    <Tag
                                                                                        closable
                                                                                        key={arg.key}
                                                                                        onClose={() =>
                                                                                            this.handleRemoveArg(id)
                                                                                        }
                                                                                    >
                                                                                        {arg.name}: {arg.value}
                                                                                    </Tag>
                                                                                ))}
                                                                                <Space
                                                                                    direction="horizontal"
                                                                                    className=""
                                                                                >
                                                                                    <Input
                                                                                        size="large"
                                                                                        className="border-estela-blue-full rounded-l-lg"
                                                                                        name="newArgName"
                                                                                        placeholder="name"
                                                                                        value={newArgName}
                                                                                        onChange={
                                                                                            this.handleInputChange
                                                                                        }
                                                                                    />
                                                                                    <Input
                                                                                        size="large"
                                                                                        className="border-estela-blue-full rounded-r-lg"
                                                                                        name="newArgValue"
                                                                                        placeholder="value"
                                                                                        value={newArgValue}
                                                                                        onChange={
                                                                                            this.handleInputChange
                                                                                        }
                                                                                    />
                                                                                    <Button
                                                                                        shape="circle"
                                                                                        size="small"
                                                                                        icon={<Add className="p-1" />}
                                                                                        className="flex items-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                                                        onClick={this.addArgument}
                                                                                    ></Button>
                                                                                    {/* <Button
                                                                                        className=""
                                                                                        onClick={this.addArgument}
                                                                                    >
                                                                                        Save Argument
                                                                                    </Button> */}
                                                                                </Space>
                                                                            </Space>
                                                                        </Form.Item>
                                                                        <Form.Item>
                                                                            <p>Environment Variables</p>
                                                                            <Space direction="vertical">
                                                                                {envVars.map(
                                                                                    (envVar: EnvVarsData, id) => (
                                                                                        <Tag
                                                                                            closable
                                                                                            key={envVar.key}
                                                                                            onClose={() =>
                                                                                                this.handleRemoveEnvVar(
                                                                                                    id,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            {envVar.name} :
                                                                                            {envVar.value}
                                                                                        </Tag>
                                                                                    ),
                                                                                )}
                                                                                <Space
                                                                                    direction="horizontal"
                                                                                    className=""
                                                                                >
                                                                                    <Input
                                                                                        size="large"
                                                                                        className="border-estela-blue-full rounded-l-lg"
                                                                                        name="newEnvVarName"
                                                                                        placeholder="name"
                                                                                        value={newEnvVarName}
                                                                                        onChange={
                                                                                            this.handleInputChange
                                                                                        }
                                                                                    />
                                                                                    <Input
                                                                                        size="large"
                                                                                        className="border-estela-blue-full rounded-r-lg"
                                                                                        name="newEnvVarValue"
                                                                                        placeholder="value"
                                                                                        value={newEnvVarValue}
                                                                                        onChange={
                                                                                            this.handleInputChange
                                                                                        }
                                                                                    />
                                                                                    <Button
                                                                                        shape="circle"
                                                                                        size="small"
                                                                                        icon={<Add className="p-1" />}
                                                                                        className="flex items-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                                                        onClick={this.addEnvVar}
                                                                                    ></Button>
                                                                                    {/* <Button
                                                                                        className=""
                                                                                        onClick={this.addEnvVar}
                                                                                    >
                                                                                        Save Environment Variable
                                                                                    </Button> */}
                                                                                </Space>
                                                                            </Space>
                                                                        </Form.Item>
                                                                        <Form.Item>
                                                                            <p>Tags</p>
                                                                            <Space direction="horizontal">
                                                                                <Space direction="horizontal">
                                                                                    {tags.map((tag: TagsData, id) => (
                                                                                        <Tag
                                                                                            closable
                                                                                            key={id}
                                                                                            onClose={() =>
                                                                                                this.handleRemoveTag(id)
                                                                                            }
                                                                                        >
                                                                                            {tag.name}
                                                                                        </Tag>
                                                                                    ))}
                                                                                </Space>
                                                                                <div className="tags">
                                                                                    <Input
                                                                                        size="large"
                                                                                        className="border-estela-blue-full rounded-lg"
                                                                                        name="newTagName"
                                                                                        placeholder="name"
                                                                                        value={newTagName}
                                                                                        onChange={
                                                                                            this.handleInputChange
                                                                                        }
                                                                                    />
                                                                                </div>
                                                                                <Button
                                                                                    shape="circle"
                                                                                    size="small"
                                                                                    icon={<Add className="p-1" />}
                                                                                    className="flex items-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                                                    onClick={this.addTag}
                                                                                ></Button>
                                                                            </Space>
                                                                        </Form.Item>
                                                                    </Form>
                                                                </div>
                                                            </Col>
                                                            <Col className="bg-yellow-100">
                                                                <div>
                                                                    <p>Select a period</p>
                                                                    <Switch className="schedule bg-estela-white-low" />
                                                                    By commom schedules
                                                                </div>
                                                                <div>
                                                                    <p>Select a period</p>
                                                                    <Switch className="bg-estela-white-low" />
                                                                    By cron schedule expression
                                                                </div>
                                                                <div>
                                                                    <p>Select a period</p>
                                                                    <Switch className="bg-estela-white-low" />
                                                                    Advanced
                                                                </div>
                                                            </Col>
                                                        </Row>
                                                        <Row justify="center">
                                                            <Button
                                                                size="large"
                                                                className="bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                                                            >
                                                                Create
                                                            </Button>
                                                            <Button
                                                                size="large"
                                                                className="bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                                                                onClick={() => this.setState({ modal: false })}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </Row>
                                                    </div>
                                                </Modal>
                                            </Col>
                                        </Row>
                                        <Row justify="center" className="bg-white rounded-lg">
                                            <div className="m-4">
                                                <Table
                                                    tableLayout="fixed"
                                                    rowSelection={{
                                                        type: "checkbox",
                                                    }}
                                                    columns={this.columns}
                                                    dataSource={cronjobs}
                                                    pagination={false}
                                                    size="small"
                                                />
                                            </div>
                                        </Row>
                                        <Row className="my-2">
                                            <Space direction="horizontal">
                                                <Button className="bg-estela-red-low border-estela-red-low text-estela-red-full hover:bg-estela-red-low hover:text-estela-red-full hover:border-estela-red-full rounded-2xl">
                                                    Delete
                                                </Button>
                                                <Button className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl">
                                                    Edit
                                                </Button>
                                                <Button className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl">
                                                    Run once
                                                </Button>
                                            </Space>
                                        </Row>
                                        <Pagination
                                            className="pagination"
                                            defaultCurrent={1}
                                            total={count}
                                            current={current}
                                            pageSize={this.PAGE_SIZE}
                                            onChange={this.onPageChange}
                                            showSizeChanger={false}
                                        />
                                    </div>
                                </Content>
                            </Layout>
                        ) : (
                            <Spin />
                        )}
                    </Content>
                </Layout>
            </Layout>
        );
    }
}
