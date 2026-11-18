import React, { Component, ReactElement } from "react";
import {
    Button,
    Checkbox,
    Input,
    Layout,
    Modal,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    message,
} from "antd";
import { CopyOutlined, QuestionCircleOutlined, WarningOutlined } from "@ant-design/icons";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiKey, ApiKeyCreateExpiresInDaysEnum, ApiKeyCreateScopesEnum } from "../../services/api";
import { Spin } from "../../shared";

const { Content } = Layout;
const { Text } = Typography;

const SCOPES = [
    { value: "data", label: "Read job data", help: "Download items, logs, requests and stats." },
    { value: "run", label: "Run jobs", help: "Launch and stop jobs and cronjobs." },
    { value: "manage", label: "Manage the project", help: "Deploy code, and create, edit or delete projects." },
];

const DURATIONS = [
    { value: ApiKeyCreateExpiresInDaysEnum._7, label: "7 days" },
    { value: ApiKeyCreateExpiresInDaysEnum._30, label: "30 days" },
    { value: ApiKeyCreateExpiresInDaysEnum._90, label: "90 days" },
    { value: ApiKeyCreateExpiresInDaysEnum._365, label: "1 year" },
];

// estela-cli sends people here with ?cli=1. It needs everything except reading
// job data is optional — it deploys, runs jobs and manages the project.
const CLI_SCOPES = ["data", "run", "manage"];

const FIELD_HELP = {
    name: "Where this key will be used, so you can recognise it later. For example, the DAG or the machine.",
    permissions: "Every key can list your projects, spiders and jobs. Add only what this one needs.",
    expiry: "The key stops working on this date. Create a new one to replace it.",
};

function FieldLabel({ label, help, className }: { label: string; help: string; className?: string }) {
    return (
        <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
            <span>{label}</span>
            <Tooltip title={help} placement="top" overlayStyle={{ maxWidth: 260 }}>
                <QuestionCircleOutlined className="text-estela-black-medium text-xs cursor-help" />
            </Tooltip>
        </div>
    );
}

interface ApiKeysPageState {
    keys: ApiKey[];
    loaded: boolean;
    createModal: boolean;
    creating: boolean;
    newName: string;
    newScopes: string[];
    newDuration: ApiKeyCreateExpiresInDaysEnum;
    forCli: boolean;
    isOperator: boolean;
    newOperator: boolean;
    cliCode: string | null;
    createdKey: string | null;
    revoking: number | null;
}

export class SettingsApiKeysPage extends Component<unknown, ApiKeysPageState> {
    state: ApiKeysPageState = {
        keys: [],
        loaded: false,
        createModal: false,
        creating: false,
        newName: "",
        newScopes: [],
        newDuration: ApiKeyCreateExpiresInDaysEnum._90,
        forCli: false,
        isOperator: false,
        newOperator: false,
        cliCode: null,
        createdKey: null,
        revoking: null,
    };

    apiService = ApiService();

    async componentDidMount(): Promise<void> {
        await this.loadKeys();
        // Only an Operator may give a key the operator scope. As on the projects page, the API answers
        // the Orgs an Operator may create Projects for, and 403 to everyone else.
        this.apiService.apiProjectsOwnerOrgs().then(
            () => this.setState({ isOperator: true }),
            () => this.setState({ isOperator: false }),
        );
        // `estela login` sends people here with ?code=, older estela-cli with ?cli=1.
        const params = new URLSearchParams(window.location.search);
        // Only a code's shape, so a link cannot put its own words in the box that warns about it.
        const cliCode = params.get("code")?.match(/^[A-Z]{4}-[A-Z]{4}$/i)?.[0] ?? null;
        if (params.get("cli") === "1" || cliCode) {
            // Prefilled, never created on arrival: a link someone sends you must not
            // mint a key by itself. The duration is left out so the key inherits
            // whatever default this deployment sets.
            this.setState({
                createModal: true,
                forCli: true,
                cliCode,
                newName: `estela-cli@${AuthService.getUserUsername() ?? ""}`,
                // Nothing checked for a code: whoever sent the link does not choose what it may do.
                newScopes: cliCode ? [] : CLI_SCOPES,
            });
        }
    }

    loadKeys = async (): Promise<void> => {
        try {
            const keys = await this.apiService.apiAccountApiKeysList();
            this.setState({ keys, loaded: true });
        } catch {
            message.error("Could not load your API keys.");
            this.setState({ loaded: true });
        }
    };

    formatDate = (date?: Date | null): string => {
        if (!date) return "Never";
        return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    };

    createKey = async (): Promise<void> => {
        const { newName, newScopes, newOperator, newDuration, cliCode } = this.state;
        if (!newName.trim()) {
            message.error("Give the key a name so you can recognise it later.");
            return;
        }
        this.setState({ creating: true });
        try {
            const created = await this.apiService.apiAccountApiKeysCreate({
                data: {
                    name: newName.trim(),
                    scopes: (newOperator ? [...newScopes, "operator"] : newScopes) as ApiKeyCreateScopesEnum[],
                    expiresInDays: newDuration,
                    code: cliCode ?? undefined,
                },
            });
            this.setState({ createModal: false, creating: false, createdKey: created.key ?? null, cliCode: null });
            if (cliCode) {
                // The key is the one `estela login` holds and is waiting for: nothing to show here.
                window.history.replaceState(null, "", window.location.pathname);
                message.success("Approved. Go back to your terminal.", 8);
            }
            await this.loadKeys();
        } catch (error) {
            // An expired or used code says so; anything else stays generic.
            const body = error instanceof Response ? await error.json().catch(() => ({})) : {};
            message.error(body.code ? String(body.code) : "Could not create the API key.");
            this.setState({ creating: false });
        }
    };

    revokeKey = (key: ApiKey): void => {
        Modal.confirm({
            title: `Revoke "${key.name}"?`,
            content: "Anything still using this key will stop working immediately. This cannot be undone.",
            okText: "Revoke",
            okButtonProps: { danger: true },
            onOk: async () => {
                this.setState({ revoking: key.id ?? null });
                try {
                    await this.apiService.apiAccountApiKeysDelete({ id: String(key.id) });
                    message.success("API key revoked.");
                    await this.loadKeys();
                } catch {
                    message.error("Could not revoke the API key.");
                }
                this.setState({ revoking: null });
            },
        });
    };

    copyText = (text: string, feedback: string): void => {
        navigator.clipboard.writeText(text);
        message.success(feedback);
    };

    copyKey = (): void => {
        const { createdKey } = this.state;
        if (!createdKey) return;
        this.copyText(createdKey, "Copied to clipboard.");
    };

    openCreateModal = (): void => {
        this.setState({
            createModal: true,
            forCli: false,
            cliCode: null,
            newName: "",
            newScopes: [],
            newOperator: false,
            newDuration: ApiKeyCreateExpiresInDaysEnum._90,
        });
    };

    columns = [
        {
            title: "NAME",
            dataIndex: "name",
            key: "name",
            render: (name: string): ReactElement => <Text className="font-medium">{name}</Text>,
        },
        {
            title: "KEY",
            dataIndex: "prefix",
            key: "prefix",
            render: (prefix: string): ReactElement => (
                <div className="flex items-center gap-2">
                    <Text className="font-courier text-estela-black-medium">{prefix}…</Text>
                    <Tooltip title="Copy this fragment to search for it in your logs">
                        <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => this.copyText(prefix, "Fragment copied.")}
                        />
                    </Tooltip>
                </div>
            ),
        },
        {
            title: "PERMISSIONS",
            dataIndex: "scopes",
            key: "scopes",
            render: (scopes?: string[]): ReactElement => (
                <div className="flex items-center gap-1">
                    <Tooltip title="Every key can read projects, spiders and jobs.">
                        <Tag className="text-estela-black-medium border-0 bg-estela-white-low rounded py-1 px-3 m-0">
                            read
                        </Tag>
                    </Tooltip>
                    {(scopes ?? []).map((scope) => (
                        <Tag
                            key={scope}
                            className="text-estela-blue-full border-0 bg-estela-blue-low rounded py-1 px-3 m-0"
                        >
                            {scope}
                        </Tag>
                    ))}
                </div>
            ),
        },
        {
            title: "CREATED",
            dataIndex: "created",
            key: "created",
            render: (created?: Date): string => this.formatDate(created),
        },
        {
            title: "LAST USED",
            dataIndex: "lastUsedAt",
            key: "lastUsedAt",
            render: (lastUsed?: Date | null): string => this.formatDate(lastUsed),
        },
        {
            title: "EXPIRES",
            dataIndex: "expiresAt",
            key: "expiresAt",
            render: (expires?: Date | null): ReactElement => {
                if (!expires) return <Text className="text-estela-black-medium">Never</Text>;
                const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000);
                if (days <= 0) return <Text className="text-estela-red-full">Expired</Text>;
                return <Text className={days <= 7 ? "text-estela-red-full" : ""}>{this.formatDate(expires)}</Text>;
            },
        },
        {
            title: "",
            key: "actions",
            render: (_: unknown, key: ApiKey): ReactElement => (
                <Button type="link" danger loading={this.state.revoking === key.id} onClick={() => this.revokeKey(key)}>
                    Revoke
                </Button>
            ),
        },
    ];

    render(): JSX.Element {
        const {
            keys,
            loaded,
            createModal,
            creating,
            newName,
            newScopes,
            newDuration,
            forCli,
            isOperator,
            newOperator,
            cliCode,
            createdKey,
        } = this.state;

        if (!loaded) return <Spin />;

        return (
            <Content className="mr-6 px-14 bg-metal rounded-2xl">
                <Row className="flex justify-between items-center my-6">
                    <div>
                        <p className="text-xl font-medium text-estela-black-full">API keys</p>
                        <p className="text-sm text-estela-black-medium mt-1">
                            Give a program access to estela without sharing your password. Each key can be revoked on
                            its own.
                        </p>
                    </div>
                    <Button
                        size="large"
                        className="h-12 px-6 bg-estela-blue-full text-white border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                        onClick={this.openCreateModal}
                    >
                        Create API key
                    </Button>
                </Row>

                <Row className="mb-6">
                    <Table
                        className="w-full rounded-2xl"
                        columns={this.columns}
                        dataSource={keys}
                        rowKey="id"
                        pagination={false}
                        size="middle"
                        locale={{ emptyText: "You have no API keys yet." }}
                    />
                </Row>

                <Modal
                    style={{ overflow: "hidden", padding: 0 }}
                    open={createModal}
                    width={700}
                    title={
                        <p className="text-xl text-center font-normal">
                            {forCli ? "NEW KEY FOR ESTELA-CLI" : "NEW API KEY"}
                        </p>
                    }
                    footer={null}
                    onCancel={() => this.setState({ createModal: false })}
                >
                    {cliCode && (
                        <Row className="bg-estela-red-low rounded-lg p-3 mb-4">
                            <p className="w-full text-sm text-estela-black-full mb-2">
                                estela-cli is asking for an API key in your name. Choose below what it may do: read
                                data, run jobs, deploy. You can revoke the key any time on this page.
                            </p>
                            <p className="w-full font-courier text-2xl text-center text-estela-black-full">{cliCode}</p>
                            <p className="text-sm text-estela-red-full mt-2">
                                <WarningOutlined /> Approve only if this is the code your terminal shows after you ran{" "}
                                <span className="font-courier">estela login</span> yourself. Approving creates an API
                                key in your name and gives that computer access to your account.
                            </p>
                        </Row>
                    )}
                    <Row>
                        <FieldLabel label="Name" help={FIELD_HELP.name} className="my-2 text-base" />
                        <Input
                            size="large"
                            className="border-estela-blue-full rounded-lg"
                            placeholder="What will use this key?"
                            value={newName}
                            onChange={(e) => this.setState({ newName: e.target.value })}
                            onPressEnter={this.createKey}
                        />
                    </Row>
                    <Row className="mt-6">
                        <FieldLabel label="Permissions" help={FIELD_HELP.permissions} className="my-2 text-base" />
                        <Space direction="vertical" className="w-full">
                            <Checkbox checked disabled>
                                <span className="text-estela-black-full">Read projects, spiders and jobs</span>
                                <span className="block text-xs text-estela-black-medium">
                                    Always included. Add below only what this key also needs.
                                </span>
                            </Checkbox>
                            <Checkbox.Group
                                className="w-full"
                                value={newScopes}
                                onChange={(values) => this.setState({ newScopes: values as string[] })}
                            >
                                <Space direction="vertical" className="w-full">
                                    {SCOPES.map((scope) => (
                                        <Checkbox key={scope.value} value={scope.value}>
                                            <span className="text-estela-black-full">{scope.label}</span>
                                            <span className="block text-xs text-estela-black-medium">{scope.help}</span>
                                        </Checkbox>
                                    ))}
                                </Space>
                            </Checkbox.Group>
                            {isOperator && (
                                <Checkbox
                                    className="mt-4"
                                    checked={newOperator}
                                    onChange={(e) => this.setState({ newOperator: e.target.checked })}
                                >
                                    <span className="text-estela-black-full">
                                        Operator: every customer&apos;s projects
                                    </span>
                                    <span className="block text-xs text-estela-red-full">
                                        <WarningOutlined /> This key reaches the projects of every customer, with the
                                        permissions checked above. Keep it on your own machine, never in a script or on
                                        a shared server.
                                    </span>
                                </Checkbox>
                            )}
                        </Space>
                    </Row>
                    <Row className="mt-6">
                        <FieldLabel label="Expires" help={FIELD_HELP.expiry} className="my-2 text-base" />
                        <Select
                            size="large"
                            className="w-full"
                            value={newDuration}
                            onChange={(value) => this.setState({ newDuration: value })}
                        >
                            {DURATIONS.map((d) => (
                                <Select.Option key={d.value} value={d.value}>
                                    {d.label}
                                </Select.Option>
                            ))}
                        </Select>
                    </Row>
                    <Row className="flow-root mt-6">
                        <div className="flex justify-between w-full">
                            <Button
                                loading={creating}
                                onClick={this.createKey}
                                size="large"
                                className="w-48 h-12 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                            >
                                {cliCode ? "Approve" : "Create"}
                            </Button>
                            <Button
                                size="large"
                                className="w-48 h-12 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                                onClick={() => this.setState({ createModal: false })}
                            >
                                Cancel
                            </Button>
                        </div>
                    </Row>
                </Modal>

                <Modal
                    style={{ overflow: "hidden", padding: 0 }}
                    open={createdKey !== null}
                    width={700}
                    title={<p className="text-xl text-center font-normal">YOUR NEW API KEY</p>}
                    footer={null}
                    onCancel={() => this.setState({ createdKey: null })}
                >
                    <Row className="bg-estela-red-low text-estela-red-full rounded-lg p-3 mb-4">
                        <Space>
                            <WarningOutlined />
                            <span className="text-sm">Copy it now. It will not be shown again.</span>
                        </Space>
                    </Row>
                    <Row className="flex items-center gap-2 bg-estela-blue-low rounded-lg p-3">
                        <span className="font-courier text-sm break-all flex-1 text-estela-black-full">
                            {createdKey}
                        </span>
                        <Button
                            icon={<CopyOutlined />}
                            className="bg-estela-blue-full text-white border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                            onClick={this.copyKey}
                        >
                            Copy
                        </Button>
                    </Row>
                    {forCli && (
                        <Row className="mt-4">
                            <Text className="text-estela-black-medium text-sm">
                                Copy the key above, then run{" "}
                                <span className="font-courier text-estela-black-full">estela set-token</span> and paste
                                it when asked.
                            </Text>
                        </Row>
                    )}
                    <Row className="flow-root mt-6">
                        <div className="flex justify-end w-full">
                            <Button
                                size="large"
                                className="w-48 h-12 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                                onClick={() => this.setState({ createdKey: null })}
                            >
                                Done
                            </Button>
                        </div>
                    </Row>
                </Modal>
            </Content>
        );
    }
}
