import React, { useState, useEffect } from "react";
import { Modal, Button, message, Row, Select, Space, Input, Tag, Checkbox, Tooltip } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import {
    ApiProjectsSpidersJobsCreateRequest,
    ApiProjectsSpidersListRequest,
    ApiProjectsSpidersReadRequest,
    ApiProjectsReadRequest,
    SpiderDataStatusEnum,
    SpiderJobCreate,
    SpiderJobEnvVar,
    Project,
    Spider,
} from "../../services/api";
import history from "../../history";
import { ApiService } from "../../services";
import { resourceNotAllowedNotification, invalidDataNotification, incorrectDataNotification } from "../../shared";
import { checkExternalError } from "../../defaultComponents";

import Run from "../../assets/icons/play.svg";
import Add from "../../assets/icons/add.svg";

const { Option } = Select;

interface JobCreateModalProps {
    openModal: boolean;
    spider: Spider | null;
    projectId: string;
}

interface MaskedTagProps {
    children: React.ReactNode;
    id: number;
    level: boolean;
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
    masked: boolean;
}

interface TagsData {
    name: string;
}

interface Tags {
    name: string;
    key: number;
}

interface JobData {
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    dataStatus: SpiderDataStatusEnum | undefined;
    dataExpiryDays: number | null | undefined;
}

interface Variable {
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    newEnvVarMasked: boolean;
    newTagName: string;
    newTags: Tags[];
}

interface Request {
    pid: string;
    sid: string;
}

interface OptionDataPersistance {
    label: string;
    key: number;
    value: number;
}

const dataPersistenceOptions = [
    { label: "1 day", key: 1, value: 1 },
    { label: "1 week", key: 2, value: 7 },
    { label: "1 month", key: 3, value: 30 },
    { label: "3 months", key: 4, value: 90 },
    { label: "6 months", key: 5, value: 180 },
    { label: "1 year", key: 6, value: 365 },
    { label: "Forever", key: 7, value: 720 },
];

export default function JobCreateModal({ openModal, spider, projectId }: JobCreateModalProps) {
    const PAGE_SIZE = 15;
    const apiService = ApiService();
    const [open, setOpen] = useState(openModal);
    const [loading, setLoading] = useState(false);
    const [countKey, setCountKey] = useState(0);
    const [spiders, setSpiders] = useState<Spider[]>([]);
    const [externalComponent, setExternalComponent] = useState<React.ReactNode>(<></>);
    const [jobData, setJobData] = useState<JobData>({
        args: [],
        envVars: [],
        tags: [],
        dataStatus: spider ? spider.dataStatus : undefined,
        dataExpiryDays: spider ? spider.dataExpiryDays : 1,
    });
    const [projectEnvVars, setProjectEnvVars] = useState<SpiderJobEnvVar[]>([]);
    const [spiderEnvVars, setSpiderEnvVars] = useState<SpiderJobEnvVar[]>([]);
    const [variable, setVariable] = useState<Variable>({
        newArgName: "",
        newArgValue: "",
        newEnvVarName: "",
        newEnvVarValue: "",
        newEnvVarMasked: false,
        newTagName: "",
        newTags: [],
    });
    const [request, setRequest] = useState<Request>({
        pid: projectId,
        sid: "",
    });

    const MaskedTag: React.FC<MaskedTagProps> = ({ children, id, level }) => {
        return (
            <Tooltip placement="top" title="Masked variable" showArrow={false} className="tooltip">
                <Tag
                    closable
                    className="bg-estela-blue-low border-none text-estela-blue-full rounded"
                    onClose={() => handleRemoveProjectEnvVar(id, level)}
                >
                    {children}
                </Tag>
            </Tooltip>
        );
    };

    useEffect(() => {
        getProjectSpiders(1);
        const requestParams: ApiProjectsReadRequest = { pid: request.pid };
        apiService.apiProjectsRead(requestParams).then(
            (response: Project) => {
                const envVars = response.envVars || [];
                setProjectEnvVars(
                    envVars.map((envVar: SpiderJobEnvVar) => {
                        return {
                            evid: envVar.evid,
                            name: envVar.name,
                            value: envVar.masked ? "__MASKED__" : envVar.value,
                            masked: envVar.masked,
                        };
                    }),
                );
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    }, []);

    const getSpiderEnvVars = (sid: number) => {
        const requestParams: ApiProjectsSpidersReadRequest = { pid: request.pid, sid: sid };
        apiService.apiProjectsSpidersRead(requestParams).then(
            async (response: Spider) => {
                const envVars = response.envVars || [];
                setSpiderEnvVars(
                    envVars.map((envVar: SpiderJobEnvVar) => {
                        return {
                            evid: envVar.evid,
                            name: envVar.name,
                            value: envVar.masked ? "__MASKED__" : envVar.value,
                            masked: envVar.masked,
                        };
                    }),
                );
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    const getProjectSpiders = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsSpidersListRequest = { pid: projectId, page, pageSize: PAGE_SIZE };
        apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                const spiderList = results.results;
                if (spiderList.length === 0) {
                    return;
                }

                if (spider) {
                    let index = 0;
                    index = spiderList.findIndex((listedSpider: Spider) => {
                        return listedSpider.sid == spider.sid;
                    });

                    if (index < 0) {
                        spiderList.unshift(spider);
                        index = 0;
                    }
                    setRequest({ ...request, sid: String(spiderList[index].sid) });
                    const envVars = spiderList[index].envVars || [];
                    setSpiderEnvVars(
                        envVars.map((envVar: SpiderJobEnvVar) => {
                            return {
                                evid: envVar.evid,
                                name: envVar.name,
                                value: envVar.masked ? "__MASKED__" : envVar.value,
                                masked: envVar.masked,
                            };
                        }),
                    );
                    setJobData({
                        ...jobData,
                        dataStatus: spiderList[index].dataStatus,
                        dataExpiryDays: spiderList[index].dataExpiryDays,
                    });
                } else {
                    setRequest({ ...request, sid: String(spiderList[0].sid) });
                    const envVars = spiderList[0].envVars || [];
                    setSpiderEnvVars(
                        envVars.map((envVar: SpiderJobEnvVar) => {
                            return {
                                evid: envVar.evid,
                                name: envVar.name,
                                value: envVar.masked ? "__MASKED__" : envVar.value,
                                masked: envVar.masked,
                            };
                        }),
                    );
                    setJobData({
                        ...jobData,
                        dataStatus: spiderList[0].dataStatus,
                        dataExpiryDays: spiderList[0].dataExpiryDays,
                    });
                }
                setSpiders(spiderList);
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    const handleSpiderChange = (value: string): void => {
        const spiderId = spiders.find((spider) => {
            return spider.name === value;
        });
        if (spiderId) {
            getSpiderEnvVars(Number(spiderId.sid));
        }
        setRequest({ ...request, sid: String(spiderId?.sid) });
    };

    const handlePersistenceChange = (value: number): void => {
        if (value == 720) {
            setJobData({ ...jobData, dataStatus: SpiderDataStatusEnum.Persistent });
        } else {
            setJobData({ ...jobData, dataExpiryDays: value });
        }
    };

    const handleRemoveArg = (id: number): void => {
        const args = [...jobData.args];
        args.splice(id, 1);
        setJobData({ ...jobData, args: [...args] });
    };

    const handleRemoveEnvVar = (id: number): void => {
        const envVars = [...jobData.envVars];
        envVars.splice(id, 1);
        setJobData({ ...jobData, envVars: [...envVars] });
    };

    const handleRemoveProjectEnvVar = (id: number, level: boolean): void => {
        if (level) {
            const envVars = [...projectEnvVars];
            envVars.splice(id, 1);
            setProjectEnvVars(envVars);
        } else {
            const envVars = [...spiderEnvVars];
            envVars.splice(id, 1);
            setSpiderEnvVars(envVars);
        }
    };

    const handleRemoveTag = (id: number): void => {
        const tags = [...jobData.tags];
        tags.splice(id, 1);
        setJobData({ ...jobData, tags: [...tags] });
    };

    const addArgument = (): void => {
        const args = [...jobData.args];
        const newArgName = variable.newArgName.trim();
        const newArgValue = variable.newArgValue.trim();
        if (newArgName && newArgValue && newArgName.indexOf(" ") == -1) {
            args.push({ name: newArgName, value: newArgValue, key: countKey });
            setCountKey(countKey + 1);
            setJobData({ ...jobData, args: [...args] });
            setVariable({ ...variable, newArgName: "", newArgValue: "" });
        } else {
            invalidDataNotification("Invalid argument name/value pair.");
        }
    };

    const addEnvVar = (): void => {
        const envVars = [...jobData.envVars];
        const newEnvVarName = variable.newEnvVarName.trim();
        const newEnvVarValue = variable.newEnvVarValue.trim();
        if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
            envVars.push({
                name: newEnvVarName,
                value: newEnvVarValue,
                masked: variable.newEnvVarMasked,
                key: countKey,
            });
            setCountKey(countKey + 1);
            setJobData({ ...jobData, envVars: [...envVars] });
            setVariable({ ...variable, newEnvVarName: "", newEnvVarValue: "", newEnvVarMasked: false });
        } else {
            invalidDataNotification("Invalid environment variable name/value pair.");
        }
    };

    const addTag = (): void => {
        const tags = [...jobData.tags];
        const newTags = [...variable.newTags];
        const newTagName = variable.newTagName.trim();
        if (newTagName && newTagName.indexOf(" ") == -1) {
            newTags.push({ name: newTagName, key: countKey });
            setCountKey(countKey + 1);
            tags.push({ name: newTagName });
            setJobData({ ...jobData, tags: [...tags] });
            setVariable({ ...variable, newTags: [...newTags], newTagName: "" });
        } else {
            invalidDataNotification("Invalid tag name.");
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newArgName") {
            setVariable({ ...variable, newArgName: value });
        } else if (name === "newArgValue") {
            setVariable({ ...variable, newArgValue: value });
        } else if (name === "newEnvVarName") {
            setVariable({ ...variable, newEnvVarName: value });
        } else if (name === "newEnvVarValue") {
            setVariable({ ...variable, newEnvVarValue: value });
        } else if (name === "newTagName") {
            setVariable({ ...variable, newTagName: value });
        }
    };

    const onChangeEnvVarMasked = (e: CheckboxChangeEvent) => {
        const { checked } = e.target;
        setVariable({ ...variable, newEnvVarMasked: checked });
    };

    const handleSubmit = (): void => {
        setLoading(true);
        const { args, tags, dataStatus, dataExpiryDays } = jobData;
        const { pid, sid } = request;

        const envVarsData = projectEnvVars.map((envVar: SpiderJobEnvVar) => {
            return envVar;
        });
        spiderEnvVars.map((envVar: SpiderJobEnvVar) => {
            const index = envVarsData.findIndex((element: SpiderJobEnvVar) => element.name === envVar.name);
            if (index != -1) {
                envVarsData[index] = envVar;
            } else {
                envVarsData.push(envVar);
            }
        });

        jobData.envVars.map((envVar: EnvVarsData) => {
            const index = envVarsData.findIndex((element: SpiderJobEnvVar) => element.name === envVar.name);
            if (index != -1) {
                envVarsData[index] = {
                    name: envVar.name,
                    value: envVar.value,
                    masked: envVar.masked,
                };
            } else {
                envVarsData.push({
                    name: envVar.name,
                    value: envVar.value,
                    masked: envVar.masked,
                });
            }
        });

        const Data = {
            args: [...args],
            envVars: [...envVarsData],
            tags: [...tags],
            dataStatus: String(dataStatus),
            dataExpiryDays: Number(dataExpiryDays),
        };
        const requests: ApiProjectsSpidersJobsCreateRequest = {
            data: Data,
            pid: pid,
            sid: sid,
        };
        apiService.apiProjectsSpidersJobsCreate(requests).then(
            (response: SpiderJobCreate) => {
                setLoading(false);
                history.push(`/projects/${pid}/spiders/${sid}/jobs/${response.jid}`);
            },
            async (error) => {
                setLoading(false);
                const data = await error.json();
                const [errorComponent, err] = checkExternalError(data);
                if (err) {
                    invalidDataNotification(data.detail);
                    setExternalComponent(errorComponent);
                } else {
                    incorrectDataNotification();
                }
                setOpen(false);
            },
        );
    };

    return (
        <>
            <Button
                icon={<Run className="mr-2" width={19} />}
                size="large"
                className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                onClick={() => {
                    if (spiders.length == 0) {
                        message.error("No spiders found. Please make a new deploy.");
                        history.push(`/projects/${projectId}/deploys`);
                    } else {
                        setOpen(true);
                    }
                }}
            >
                Run new job
            </Button>
            {externalComponent}
            <Modal
                style={{
                    overflow: "hidden",
                    padding: 0,
                }}
                open={open}
                centered
                width={460}
                title={<p className="text-xl text-center font-normal">NEW JOB</p>}
                onCancel={() => setOpen(false)}
                footer={null}
            >
                <Row>
                    <p className="my-2 text-base">Spider</p>
                    <Select
                        style={{ borderRadius: 16 }}
                        size="large"
                        className="w-full"
                        defaultValue={spider ? spider.name : spiders[0] ? spiders[0].name : ""}
                        onChange={handleSpiderChange}
                    >
                        {spiders.map((spider: Spider) => (
                            <Option key={spider.sid} value={spider.name}>
                                {spider.name}
                            </Option>
                        ))}
                    </Select>
                </Row>
                <Row>
                    <p className="text-base my-2">Data persistence</p>
                    <Select
                        onChange={handlePersistenceChange}
                        className="w-full"
                        size="large"
                        defaultValue={jobData.dataStatus === "PERSISTENT" ? 720 : jobData.dataExpiryDays}
                    >
                        {dataPersistenceOptions.map((option: OptionDataPersistance) => (
                            <Option className="text-sm" key={option.key} value={option.value}>
                                {option.label}
                            </Option>
                        ))}
                    </Select>
                </Row>
                <Row>
                    <p className="text-base my-2">Arguments</p>
                    <Space direction="vertical">
                        <Space direction="horizontal">
                            {jobData.args.map((arg: ArgsData, id: number) => (
                                <Tag
                                    className="text-estela-blue-full border-0 bg-estela-blue-low"
                                    closable
                                    key={id}
                                    onClose={() => handleRemoveArg(id)}
                                >
                                    {arg.name}: {arg.value}
                                </Tag>
                            ))}
                        </Space>
                        <Space direction="horizontal">
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-l-lg"
                                name="newArgName"
                                placeholder="name"
                                value={variable.newArgName}
                                onChange={handleInputChange}
                            />
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-r-lg"
                                name="newArgValue"
                                placeholder="value"
                                value={variable.newArgValue}
                                onChange={handleInputChange}
                            />
                            <Button
                                shape="circle"
                                size="small"
                                icon={<Add />}
                                className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                onClick={addArgument}
                            ></Button>
                        </Space>
                    </Space>
                </Row>
                <Row>
                    <p className="text-base my-2">Environment Variables</p>
                    <Space direction="vertical">
                        <div className="flex gap-2 mt-1">
                            <p className="text-sm">Project</p>
                            <div className="flex gap-2">
                                {projectEnvVars.map((envVar: SpiderJobEnvVar, id: number) =>
                                    envVar.masked ? (
                                        <MaskedTag key={id} id={id} level={true}>
                                            {envVar.name}
                                        </MaskedTag>
                                    ) : (
                                        <Tag
                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                            closable
                                            key={id}
                                            onClose={() => handleRemoveProjectEnvVar(id, true)}
                                        >
                                            {envVar.name}: {envVar.value}
                                        </Tag>
                                    ),
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 my-2">
                            <p className="text-sm">Spider</p>
                            <div className="flex gap-2">
                                {spiderEnvVars.map((envVar: SpiderJobEnvVar, id: number) =>
                                    envVar.masked ? (
                                        <MaskedTag key={id} id={id} level={false}>
                                            {envVar.name}
                                        </MaskedTag>
                                    ) : (
                                        <Tag
                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                            closable
                                            key={id}
                                            onClose={() => handleRemoveProjectEnvVar(id, false)}
                                        >
                                            {envVar.name}: {envVar.value}
                                        </Tag>
                                    ),
                                )}
                            </div>
                        </div>
                        <Space direction="horizontal" className="mb-2">
                            {jobData.envVars.map((envVar: EnvVarsData, id: number) =>
                                envVar.masked ? (
                                    <Tooltip key={id} placement="top" title="Masked variable" showArrow={false}>
                                        <Tag
                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                            closable
                                            onClose={() => handleRemoveEnvVar(id)}
                                        >
                                            {envVar.name}
                                        </Tag>
                                    </Tooltip>
                                ) : (
                                    <Tag
                                        className="text-estela-blue-full border-0 bg-estela-blue-low"
                                        closable
                                        key={id}
                                        onClose={() => handleRemoveEnvVar(id)}
                                    >
                                        {envVar.name}: {envVar.value}
                                    </Tag>
                                ),
                            )}
                        </Space>
                        <Space direction="horizontal">
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-l-lg"
                                name="newEnvVarName"
                                placeholder="name"
                                value={variable.newEnvVarName}
                                onChange={handleInputChange}
                            />
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-r-lg"
                                name="newEnvVarValue"
                                placeholder="value"
                                value={variable.newEnvVarValue}
                                onChange={handleInputChange}
                            />
                            <Checkbox checked={variable.newEnvVarMasked} onChange={onChangeEnvVarMasked}>
                                Masked
                            </Checkbox>
                            <Button
                                shape="circle"
                                size="small"
                                icon={<Add />}
                                className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                onClick={addEnvVar}
                            ></Button>
                        </Space>
                    </Space>
                </Row>
                <Space direction="vertical" className="my-2">
                    <p className="text-base">Tags</p>
                    <Space direction="horizontal">
                        {jobData.tags.map((tag: TagsData, id) => (
                            <Tag
                                className="text-estela-blue-full border-0 bg-estela-blue-low"
                                closable
                                key={id}
                                onClose={() => handleRemoveTag(id)}
                            >
                                {tag.name}
                            </Tag>
                        ))}
                    </Space>
                    <Space direction="horizontal">
                        <Input
                            size="large"
                            className="border-estela-blue-full rounded-lg"
                            name="newTagName"
                            placeholder="name"
                            value={variable.newTagName}
                            onChange={handleInputChange}
                        />
                        <Button
                            shape="circle"
                            size="small"
                            icon={<Add />}
                            className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                            onClick={addTag}
                        ></Button>
                    </Space>
                </Space>
                <Row className="flow-root mt-4">
                    <Button
                        loading={loading}
                        onClick={handleSubmit}
                        size="large"
                        className="float-left w-48 h-12 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                    >
                        Create
                    </Button>
                    <Button
                        size="large"
                        className="float-right w-48 h-12 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                </Row>
            </Modal>
        </>
    );
}
