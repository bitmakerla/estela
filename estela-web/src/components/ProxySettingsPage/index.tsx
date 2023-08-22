import React, { useEffect, useState } from "react";
import { Row, Space, Button, Tag, Popover, Modal } from "antd";

import "./styles.scss";
import Menu from "../../assets/icons/menu.svg";
import { ApiService } from "../../services";
import {
    ApiProjectsUpdateRequest,
    ProjectUpdate,
    SpiderUpdate,
    SpiderJobEnvVar,
    ApiProjectsSpidersUpdateRequest,
} from "../../services/api";
import { ProxyForm } from "./ProxyForm";
import { ProjectEnvVar } from "./types";
import { handleInvalidDataError } from "../../utils";
import { Content } from "antd/lib/layout/layout";

export const ProxySettings: React.FC<ProjectEnvVar> = ({
    projectId,
    spiderId,
    envVarsData,
    level,
    setEnvVarsOnParent,
}) => {
    const [envVars, setEnvVars] = useState<SpiderJobEnvVar[]>(envVarsData);
    const [shouldDeleteEnvVars, setShouldDeleteEnvVars] = useState(false);
    const [openProxyUserModal, setOpenProxyUserModal] = useState(false);

    const apiService = ApiService();

    const ProxyTag: React.FC<ProxyTagProps> = ({ children, id }) => {
        const [openEditModal, setOpenEditModal] = useState(false);
        const [openDeleteModal, setOpenDeleteModal] = useState(false);
        const [renderTag, setRenderTag] = useState(true);
        const [openPopover, setOpenPopover] = useState(false);

        useEffect(() => {
            setEnvVarsOnParent && setEnvVarsOnParent(envVars);
        }, [envVars]);

        const SettingContent = (
            <div className="grid">
                <Button
                    size="large"
                    onClick={() => {
                        setOpenEditModal(true);
                        setOpenPopover(false);
                    }}
                    className="text-estela-black-medium border-0 hover:bg-estela-blue-low hover:text-estela-blue-full rounded-lg"
                >
                    Edit
                </Button>
                <Modal
                    open={openEditModal}
                    width={400}
                    title={<p className="text-center text-base">Edit Proxy Settings</p>}
                    onCancel={() => setOpenEditModal(false)}
                    footer={null}
                >
                    <div className="bg-white my-4">
                        <Content>
                            <ProxyForm
                                projectId={projectId}
                                spiderId={spiderId}
                                envVarsData={envVars}
                                level={level}
                                type="Edit"
                                closeModal={() => setOpenEditModal(false)}
                                setParentEnvVars={setEnvVars}
                            ></ProxyForm>
                        </Content>
                    </div>
                </Modal>
                <Button
                    size="large"
                    onClick={() => {
                        setOpenDeleteModal(true);
                        setOpenPopover(false);
                    }}
                    className="text-estela-black-medium border-0 hover:bg-estela-blue-low hover:text-estela-blue-full rounded-lg"
                >
                    Delete
                </Button>
                <Modal
                    open={openDeleteModal}
                    width={490}
                    title={<p className="text-center">CONFIRM ACTION</p>}
                    onCancel={() => setOpenDeleteModal(false)}
                    footer={null}
                >
                    <>
                        <p className="text-center text-base text-estela-black-full mb-4">
                            Are you sure you want to delete this environment variable
                        </p>
                        <div className="flex gap-4 w-full">
                            <Button
                                onClick={() => {
                                    setRenderTag(false);
                                    handleRemoveProxy();
                                    setOpenDeleteModal(false);
                                    setOpenPopover(false);
                                }}
                                className="bg-estela-blue-full text-base border-estela-blue-full hover:border-estela-blue-full text-white rounded-lg hover:text-estela-blue-full hover:bg-estela-blue-low h-14 w-full"
                            >
                                Confirm
                            </Button>
                            <Button
                                className="border-estela-blue-full hover:border-estela-blue-full hover:text-estela-blue-full text-estela-blue-full text-base rounded-lg h-14 w-full"
                                onClick={() => setOpenDeleteModal(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </>
                </Modal>
            </div>
        );

        const tagStyle =
            "w-96 h-24 flex items-center justify-between text-base pr-2 py-1 pl-3 border-estela-blue-low text-estela-blue-full bg-estela-blue-low hover:border-estela-blue-full rounded-xl";

        return (
            <>
                {renderTag && (
                    <Tag key={id} className={tagStyle}>
                        <div className="flex flex-col justify-center">
                            <span>{children}</span>
                            <span className="text-sm text-gray-600">You are using your own proxy.</span>
                        </div>
                        <div className="flex items-center">
                            <Popover
                                onOpenChange={(open) => setOpenPopover(open)}
                                open={openPopover}
                                className="padding-0 rounded-lg"
                                content={SettingContent}
                                trigger="click"
                                showArrow={false}
                                placement="right"
                            >
                                <Button
                                    className="flex items-center justify-right w-4 ml-1 rounded-2xl bg-estela-blue-low border-0 hover:bg-estela-blue-low"
                                    icon={<Menu />}
                                ></Button>
                            </Popover>
                        </div>
                    </Tag>
                )}
            </>
        );
    };

    const getProxyValue = (envVarName: string): string => {
        const proxyNameObj = envVars.find((obj) => obj.name === envVarName);
        return proxyNameObj ? proxyNameObj.value : "";
    };
    const checkIfProxyExist = (): boolean => {
        const propertiesToFind: Array<string> = [
            "ESTELA_PROXY_URL",
            "ESTELA_PROXY_PORT",
            "ESTELA_PROXY_USER",
            "ESTELA_PROXY_PASS",
            "ESTELA_PROXY_NAME",
        ];
        return propertiesToFind.every((property) => envVars.some((obj) => obj.name === property));
    };

    const deleteProjectEnvVars = (): void => {
        const requestData: ProjectUpdate = {
            envVars: envVars,
        };
        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: projectId,
        };
        apiService.apiProjectsUpdate(request).then(
            (response: ProjectUpdate) => {
                let envVars = response.envVars || [];
                envVars = envVars.map((envVar: SpiderJobEnvVar) => {
                    return {
                        name: envVar.name,
                        value: envVar.masked ? "__MASKED__" : envVar.value,
                        masked: envVar.masked,
                    };
                });
                setEnvVars(envVars);
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    const deleteSpiderEnvVars = (): void => {
        const requestData: SpiderUpdate = {
            envVars: envVars,
        };
        const request: ApiProjectsSpidersUpdateRequest = {
            data: requestData,
            pid: projectId,
            sid: Number(spiderId),
        };
        apiService.apiProjectsSpidersUpdate(request).then(
            (response: SpiderUpdate) => {
                let envVars = response.envVars || [];
                envVars = envVars.map((envVar: SpiderJobEnvVar) => {
                    return {
                        name: envVar.name,
                        value: envVar.masked ? "__MASKED__" : envVar.value,
                        masked: envVar.masked,
                    };
                });
                setEnvVars(envVars);
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    const handleRemoveProxy = (): void => {
        const propertiesToFind: Array<string> = [
            "ESTELA_PROXY_URL",
            "ESTELA_PROXY_PORT",
            "ESTELA_PROXY_USER",
            "ESTELA_PROXY_PASS",
            "ESTELA_PROXY_NAME",
            "CUSTOM_PROXIES_ENABLED",
        ];
        const filteredEnvVars = envVars.filter((obj) => !propertiesToFind.includes(obj.name));
        setEnvVars(filteredEnvVars);
        setShouldDeleteEnvVars(true);
    };

    useEffect(() => {
        if (shouldDeleteEnvVars) {
            if (level == "project") {
                deleteProjectEnvVars();
            } else if (level === "spider") {
                deleteSpiderEnvVars();
            }
            setShouldDeleteEnvVars(false);
        }
    }, [envVars, shouldDeleteEnvVars]);

    return (
        <div>
            {checkIfProxyExist() ? (
                <Row className="bg-white rounded-lg my-4">
                    <Space direction="vertical" className="lg:m-8 md:mx-6 m-4 w-full">
                        <div className="flex flex-col">
                            <p className="text-2xl text-black">Proxy Settings</p>
                            <p className="text-estela-black-medium text-sm">
                                Control and configure your proxies effortlessly.
                            </p>
                            <ProxyTag key="123" id={123} proxySettings={envVars}>
                                {getProxyValue("ESTELA_PROXY_NAME")}
                            </ProxyTag>
                        </div>
                    </Space>
                </Row>
            ) : (
                <Row className="bg-white rounded-lg my-4">
                    <Space direction="vertical" className="lg:m-8 md:mx-6 m-4 w-full">
                        <div className="flex flex-col">
                            <p className="text-2xl text-black">Proxy Settings</p>
                            <p className="text-estela-black-medium text-sm">
                                Control and configure your proxies effortlessly.
                            </p>
                            <div className="mt-4">
                                <div className="">
                                    <Row className="flex flex-col space-y-4">
                                        <Button
                                            onClick={() => {
                                                setOpenProxyUserModal(true);
                                            }}
                                            size="large"
                                            className="text-estela-blue-full w-96 h-24 border-0 bg-estela-blue-low text-base rounded estela-border-proxy"
                                        >
                                            <span className="text-center font-semibold">Manual configuration</span>
                                            <p className="text-xs text-estela-black-full">Configure your own proxy</p>
                                        </Button>
                                        <Button
                                            size="large"
                                            className="text-estela-blue-full w-96 h-24 border-0 bg-estela-blue-low text-base rounded estela-border-proxy"
                                        >
                                            <span className="text-center font-semibold">BMC Proxy</span>
                                            <p className="text-xs text-estela-black-full">Recommended</p>
                                        </Button>
                                    </Row>
                                    <Modal
                                        open={openProxyUserModal}
                                        className="w-1/2"
                                        title={<p className="text-center text-base">New proxy configuration</p>}
                                        onCancel={() => setOpenProxyUserModal(false)}
                                        footer={null}
                                    >
                                        <div className="bg-white my-4">
                                            <Content>
                                                <ProxyForm
                                                    projectId={projectId}
                                                    spiderId={spiderId}
                                                    envVarsData={envVars}
                                                    level={level}
                                                    type="Add"
                                                    closeModal={() => setOpenProxyUserModal(false)}
                                                    setParentEnvVars={setEnvVars}
                                                ></ProxyForm>
                                            </Content>
                                        </div>
                                    </Modal>
                                </div>
                            </div>
                        </div>
                    </Space>
                </Row>
            )}
        </div>
    );
};
