import React, { useState } from "react";
import { Row, Space, Button, Tag, Tooltip, Checkbox, Input, Popover, Modal, Form } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import { Link } from "react-router-dom";

import "./styles.scss";
//import Add from "../../assets/icons/add.svg";
import Menu from "../../assets/icons/menu.svg";
import { ApiService } from "../../services";
import {
    ApiProjectsUpdateRequest,
    SpiderJobEnvVar,
    ProjectUpdate,
    SpiderUpdate,
    ApiProjectsSpidersUpdateRequest,
} from "../../services/api";
import { invalidDataNotification } from "../../shared";
import { handleInvalidDataError } from "../../utils";
import { Content } from "antd/lib/layout/layout";

interface ProjectEnvVar {
    projectId: string;
    spiderId: string;
    envVarsData: SpiderJobEnvVar[];
    level: string;
}
interface ProxySettings {
    ESTELA_PROXY_URL: string;
    ESTELA_PROXY_PORT: string;
    ESTELA_PROXY_USER: string;
    ESTELA_PROXY_PASS: string;
    ESTELA_PROXY_NAME: string;
}

interface CustomTagProps {
    children: React.ReactNode;
    id: number;
    envVar: SpiderJobEnvVar;
}

export const ProxySettings: React.FC<ProjectEnvVar> = ({ projectId, spiderId, envVarsData, level }) => {
    const [newEnvVarMasked, setNewEnvVarMasked] = useState(false);
    const [newEnvVarName, setNewEnvVarName] = useState("");
    const [newEnvVarValue, setNewEnvVarValue] = useState("");
    const [envVars, setEnvVars] = useState<SpiderJobEnvVar[]>(envVarsData);
    const [submitted, setSubmitted] = useState(false);
    //const [proxyExist, setProxyExist] = useState(false);
    const [openProxyUserModal, setOpenProxyUserModal] = useState(false);
    const [proxySettings, setProxySettings] = useState<ProxySettings>({
        ESTELA_PROXY_URL: "",
        ESTELA_PROXY_PORT: "",
        ESTELA_PROXY_USER: "",
        ESTELA_PROXY_PASS: "",
        ESTELA_PROXY_NAME: "",
    });
    const [openModal, setOpenModal] = useState(false);
    const [activeUpdateButton, setActiveUpdateButton] = useState(false);

    const apiService = ApiService();

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newEnvVarName") {
            setNewEnvVarName(value);
        } else if (name === "newEnvVarValue") {
            setNewEnvVarValue(value);
        }
    };

    const getProxyName = (): string => {
        const proxyNameObj = envVars.find((obj) => obj.name === "ESTELA_PROXY_NAME");
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

    const onChangeEnvVarMasked = (e: CheckboxChangeEvent) => {
        setNewEnvVarMasked(e.target.checked);
    };

    const addEnvVar = (): void => {
        if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
            envVars.push({ name: newEnvVarName, value: newEnvVarValue, masked: newEnvVarMasked });
            setEnvVars(envVars);
            setNewEnvVarName("");
            setNewEnvVarValue("");
            setNewEnvVarMasked(false);
            setOpenModal(false);
            setActiveUpdateButton(true);
        } else {
            invalidDataNotification("Invalid environment variable name/value pair.");
        }
    };
    // Debo validar que los proxies esten bien
    const updateProxySettings = (): void => {
        console.log("Nada");
    };

    const validProxySettings = (proxySettings: ProxySettings): boolean => {
        return (
            proxySettings.ESTELA_PROXY_PASS != "" &&
            proxySettings.ESTELA_PROXY_URL != "" &&
            proxySettings.ESTELA_PROXY_PORT != "" &&
            proxySettings.ESTELA_PROXY_USER != "" &&
            proxySettings.ESTELA_PROXY_NAME != ""
        );
    };

    const handleChangeProxy = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setProxySettings({ ...proxySettings, [e.target.name]: e.target.value });
        console.log(proxySettings);
        if (validProxySettings(proxySettings)) {
            setActiveUpdateButton(true);
        } else {
            setActiveUpdateButton(false);
        }
    };

    const updateEnvVars = (): void => {
        if (level === "project") {
            updateProjectEnvVars();
        } else if (level === "spider") {
            updateSpiderEnvVars();
        }
    };

    const updateSpiderEnvVars = (): void => {
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
                setActiveUpdateButton(false);
            },
            (error: unknown) => {
                console.error(error);
            },
        );
    };

    const updateProjectEnvVars = (): void => {
        const envVarsList: SpiderJobEnvVar[] = Object.entries(proxySettings).map(([key, value]) => {
            return {
                name: key,
                value: value,
                masked: false,
            };
        });
        envVarsList.push({
            name: "CUSTOM_PROXIES_ENABLED",
            value: "true",
            masked: false,
        });
        const requestData: ProjectUpdate = {
            envVars: envVarsList,
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
                setActiveUpdateButton(false);
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };
    // const setOpenEditModal = (value: boolean): void => {};
    // const setOpenPopover = (value: boolean): void => {};
    // const openEditModal = (value: boolean): void => {};

    // const SettingContent = (
    //     <div className="grid">
    //         <Button
    //             size="large"
    //             onClick={() => {
    //                 setOpenEditModal(true);
    //                 setOpenPopover(false);
    //             }}
    //             className="text-estela-black-medium border-0 hover:bg-estela-blue-low hover:text-estela-blue-full rounded-lg"
    //         >
    //             Edit
    //         </Button>
    //         <Modal
    //             open={openEditModal}
    //             width={400}
    //             title={<p className="text-center text-base">Edit environment variable</p>}
    //             onCancel={() => setOpenEditModal(false)}
    //             footer={null}
    //         >
    //             <div className="grid gap-4">
    //                 <div>
    //                     <p className="text-base text-estela-black-full mb-2">Name</p>
    //                     <Input
    //                         size="large"
    //                         className="border-estela-blue-full rounded-lg"
    //                         name="envVarName"
    //                         placeholder={envVarName}
    //                         value={envVarName}
    //                         onChange={onEditInputChange}
    //                     />
    //                 </div>
    //                 <div>
    //                     <p className="text-base text-estela-black-full mb-2">Value</p>
    //                     <Input
    //                         size="large"
    //                         className="border-estela-blue-full rounded-lg"
    //                         name="envVarValue"
    //                         placeholder={envVarValue}
    //                         value={envVarValue}
    //                         onChange={onEditInputChange}
    //                     />
    //                 </div>
    //                 <Checkbox checked={envVarMasked} onChange={onEditEnvVarMasked}>
    //                     Add as masked environment variable
    //                 </Checkbox>
    //                 <div className="flex gap-4 w-full mt-2">
    //                     <Button
    //                         className="bg-estela-blue-full text-base border-estela-blue-full hover:border-estela-blue-full text-white rounded-lg hover:text-estela-blue-full hover:bg-estela-blue-low h-14 w-full"
    //                         onClick={() => handleEditEnvVar()}
    //                     >
    //                         Edit
    //                     </Button>
    //                     <Button
    //                         className="border-estela-blue-full hover:border-estela-blue-full hover:text-estela-blue-full text-estela-blue-full text-base rounded-lg h-14 w-full"
    //                         onClick={() => setOpenEditModal(false)}
    //                     >
    //                         Cancel
    //                     </Button>
    //                 </div>
    //             </div>
    //         </Modal>
    //         <Button
    //             size="large"
    //             onClick={() => {
    //                 setOpenDeleteModal(true);
    //                 setOpenPopover(false);
    //             }}
    //             className="text-estela-black-medium border-0 hover:bg-estela-blue-low hover:text-estela-blue-full rounded-lg"
    //         >
    //             Delete
    //         </Button>
    //         <Modal
    //             open={openDeleteModal}
    //             width={490}
    //             title={<p className="text-center">CONFIRM ACTION</p>}
    //             onCancel={() => setOpenDeleteModal(false)}
    //             footer={null}
    //         >
    //             <>
    //                 <p className="text-center text-base text-estela-black-full mb-4">
    //                     Are you sure you want to delete this environment variable
    //                 </p>
    //                 <div className="flex gap-4 w-full">
    //                     <Button
    //                         onClick={() => {
    //                             handleRemoveEnvVar();
    //                             setOpenDeleteModal(false);
    //                             setOpenPopover(false);
    //                         }}
    //                         className="bg-estela-blue-full text-base border-estela-blue-full hover:border-estela-blue-full text-white rounded-lg hover:text-estela-blue-full hover:bg-estela-blue-low h-14 w-full"
    //                     >
    //                         Confirm
    //                     </Button>
    //                     <Button
    //                         className="border-estela-blue-full hover:border-estela-blue-full hover:text-estela-blue-full text-estela-blue-full text-base rounded-lg h-14 w-full"
    //                         onClick={() = setOpenDeleteModal(false)}
    //                     >
    //                         Cancel
    //                     </Button>
    //                 </div>
    //             </>
    //         </Modal>
    //     </div>
    // );

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
                            <p className="text-2xl mt-4 text-estela-blue-full">{getProxyName()} Proxy Already Set!</p>
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
                                            // loading={loading}
                                            onClick={() => {
                                                setOpenProxyUserModal(true);
                                            }}
                                            size="large"
                                            className="text-estela-blue-full w-1/2 h-24 border-0 bg-estela-blue-low text-base rounded estela-border-proxy"
                                        >
                                            <span className="text-center font-semibold">Manual configuration</span>
                                            <p className="text-xs text-estela-black-full">Configure your own proxy</p>
                                        </Button>
                                        <Button
                                            // loading={loading}
                                            // onClick={handleSubmit}
                                            size="large"
                                            className="text-estela-blue-full w-1/2 h-24 border-0 bg-estela-blue-low text-base rounded estela-border-proxy"
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
                                                <Form layout="vertical">
                                                    <div className="">
                                                        <Form.Item label="Username" name="proxy_username">
                                                            <Input
                                                                size="large"
                                                                placeholder="Username"
                                                                name="ESTELA_PROXY_USER"
                                                                onChange={handleChangeProxy}
                                                                className="input-proxy-form border-estela placeholder:text-estela-black-low"
                                                            />
                                                        </Form.Item>
                                                        <Form.Item label="Password" name="proxy_password">
                                                            <Input
                                                                size="large"
                                                                placeholder="Password"
                                                                name="ESTELA_PROXY_PASS"
                                                                onChange={handleChangeProxy}
                                                                className="input-proxy-form border-estela placeholder:text-estela-black-low"
                                                            />
                                                        </Form.Item>
                                                        <Form.Item label="Proxy Address" name="proxy_address">
                                                            <Input
                                                                size="large"
                                                                placeholder="E.g. 10.80.4.176"
                                                                name="ESTELA_PROXY_URL"
                                                                onChange={handleChangeProxy}
                                                                className="input-proxy-form border-estela placeholder:text-estela-black-low"
                                                            />
                                                        </Form.Item>
                                                        <Form.Item label="Proxy Port" name="proxy_port">
                                                            <Input
                                                                size="large"
                                                                placeholder="E.g. 8080"
                                                                name="ESTELA_PROXY_PORT"
                                                                onChange={handleChangeProxy}
                                                                className="input-proxy-form border-estela placeholder:text-estela-black-low"
                                                            />
                                                        </Form.Item>
                                                        <Form.Item label="Proxy Name" name="proxy_name">
                                                            <Input
                                                                size="large"
                                                                placeholder="E.g. my_proxy"
                                                                name="ESTELA_PROXY_NAME"
                                                                onChange={handleChangeProxy}
                                                                // onChange={this.handleNameChange}
                                                                className="input-proxy-form border-estela placeholder:text-estela-black-low"
                                                            />
                                                        </Form.Item>
                                                    </div>
                                                    <div className="h-12 w-100 button-container">
                                                        <Button
                                                            block
                                                            disabled={!activeUpdateButton}
                                                            htmlType="submit"
                                                            onClick={updateEnvVars}
                                                            className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base  min-h-full button-spacing"
                                                        >
                                                            Add
                                                        </Button>
                                                        <Button
                                                            block
                                                            htmlType="submit"
                                                            onClick={() => setOpenProxyUserModal(false)}
                                                            className="border-estela hover:border-estela hover:text-estela text-estela rounded-md text-base  min-h-full button-spacing"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </Form>
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

// const CustomTag: React.FC<CustomTagProps> = ({ children, id, envVar }) => {
//     const [openEditModal, setOpenEditModal] = useState(false);
//     const [openDeleteModal, setOpenDeleteModal] = useState(false);
//     const [openPopover, setOpenPopover] = useState(false);
//     const [envVarName, setEnvVarName] = useState(envVar.name);
//     const [envVarValue, setEnvVarValue] = useState(envVar.value);
//     const [envVarMasked, setEnvVarMasked] = useState(envVar.masked);
//     const [renderTag, setRenderTag] = useState(true);

//     const onEditEnvVarMasked = (e: CheckboxChangeEvent) => {
//         const { checked } = e.target;
//         setEnvVarMasked(checked);
//     };

//     const onEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const { name, value } = e.target;
//         if (name === "envVarName") {
//             setEnvVarName(value);
//         } else if (name === "envVarValue") {
//             setEnvVarValue(value);
//         }
//     };

//     const handleEditEnvVar = () => {
//         const envVarUpdated = [...envVars];
//         envVarUpdated[id].name = envVarName;
//         envVarUpdated[id].value = envVarValue;
//         envVarUpdated[id].masked = envVarMasked;
//         setEnvVars(envVarUpdated);
//         setActiveUpdateButton(true);
//         setOpenEditModal(false);
//     };

//     const handleRemoveEnvVar = (): void => {
//         envVars.splice(id, 1);
//         setEnvVars(envVars);
//         setRenderTag(false);
//         setActiveUpdateButton(true);
//     };

//     const SettingContent = (
//         <div className="grid">
//             <Button
//                 size="large"
//                 onClick={() => {
//                     setOpenEditModal(true);
//                     setOpenPopover(false);
//                 }}
//                 className="text-estela-black-medium border-0 hover:bg-estela-blue-low hover:text-estela-blue-full rounded-lg"
//             >
//                 Edit
//             </Button>
//             <Modal
//                 open={openEditModal}
//                 width={400}
//                 title={<p className="text-center text-base">Edit environment variable</p>}
//                 onCancel={() => setOpenEditModal(false)}
//                 footer={null}
//             >
//                 <div className="grid gap-4">
//                     <div>
//                         <p className="text-base text-estela-black-full mb-2">Name</p>
//                         <Input
//                             size="large"
//                             className="border-estela-blue-full rounded-lg"
//                             name="envVarName"
//                             placeholder={envVarName}
//                             value={envVarName}
//                             onChange={onEditInputChange}
//                         />
//                     </div>
//                     <div>
//                         <p className="text-base text-estela-black-full mb-2">Value</p>
//                         <Input
//                             size="large"
//                             className="border-estela-blue-full rounded-lg"
//                             name="envVarValue"
//                             placeholder={envVarValue}
//                             value={envVarValue}
//                             onChange={onEditInputChange}
//                         />
//                     </div>
//                     <Checkbox checked={envVarMasked} onChange={onEditEnvVarMasked}>
//                         Add as masked environment variable
//                     </Checkbox>
//                     <div className="flex gap-4 w-full mt-2">
//                         <Button
//                             className="bg-estela-blue-full text-base border-estela-blue-full hover:border-estela-blue-full text-white rounded-lg hover:text-estela-blue-full hover:bg-estela-blue-low h-14 w-full"
//                             onClick={() => handleEditEnvVar()}
//                         >
//                             Edit
//                         </Button>
//                         <Button
//                             className="border-estela-blue-full hover:border-estela-blue-full hover:text-estela-blue-full text-estela-blue-full text-base rounded-lg h-14 w-full"
//                             onClick={() => setOpenEditModal(false)}
//                         >
//                             Cancel
//                         </Button>
//                     </div>
//                 </div>
//             </Modal>
//             <Button
//                 size="large"
//                 onClick={() => {
//                     setOpenDeleteModal(true);
//                     setOpenPopover(false);
//                 }}
//                 className="text-estela-black-medium border-0 hover:bg-estela-blue-low hover:text-estela-blue-full rounded-lg"
//             >
//                 Delete
//             </Button>
//             <Modal
//                 open={openDeleteModal}
//                 width={490}
//                 title={<p className="text-center">CONFIRM ACTION</p>}
//                 onCancel={() => setOpenDeleteModal(false)}
//                 footer={null}
//             >
//                 <>
//                     <p className="text-center text-base text-estela-black-full mb-4">
//                         Are you sure you want to delete this environment variable
//                     </p>
//                     <div className="flex gap-4 w-full">
//                         <Button
//                             onClick={() => {
//                                 handleRemoveEnvVar();
//                                 setOpenDeleteModal(false);
//                                 setOpenPopover(false);
//                             }}
//                             className="bg-estela-blue-full text-base border-estela-blue-full hover:border-estela-blue-full text-white rounded-lg hover:text-estela-blue-full hover:bg-estela-blue-low h-14 w-full"
//                         >
//                             Confirm
//                         </Button>
//                         <Button
//                             className="border-estela-blue-full hover:border-estela-blue-full hover:text-estela-blue-full text-estela-blue-full text-base rounded-lg h-14 w-full"
//                             onClick={() => setOpenDeleteModal(false)}
//                         >
//                             Cancel
//                         </Button>
//                     </div>
//                 </>
//             </Modal>
//         </div>
//     );

//     const tagStyle =
//         "flex items-center justify-center text-base pr-2 py-1 pl-3 border-estela-blue-low text-estela-blue-full bg-estela-blue-low hover:border-estela-blue-full rounded-xl";

//     return (
//         <>
//             {renderTag && (
//                 <Tag key={id} className={tagStyle}>
//                     {children}
//                     <Popover
//                         onOpenChange={(open) => setOpenPopover(open)}
//                         open={openPopover}
//                         className="padding-0 rounded-lg"
//                         content={SettingContent}
//                         trigger="click"
//                         showArrow={false}
//                         placement="right"
//                     >
//                         <Button
//                             className="flex items-center justify-center w-4 ml-1 rounded-2xl bg-estela-blue-low border-0 hover:bg-estela-blue-low"
//                             icon={<Menu />}
//                         ></Button>
//                     </Popover>
//                 </Tag>
//             )}
//         </>
//     );
// };
