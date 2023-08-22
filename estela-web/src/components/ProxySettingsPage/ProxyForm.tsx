import React, { useEffect, useState } from "react";
import { Button, Input, Form } from "antd";

import "./styles.scss";
import { ApiService } from "../../services";
import {
    ApiProjectsUpdateRequest,
    SpiderJobEnvVar,
    ProjectUpdate,
    SpiderUpdate,
    ApiProjectsSpidersUpdateRequest,
} from "../../services/api";
import { ProjectEnvVar } from "./types";

import { handleInvalidDataError } from "../../utils";

const apiService = ApiService();

interface FormType {
    type: string;
    closeModal: () => void;
    setParentEnvVars: (value: SpiderJobEnvVar[]) => void;
}

interface ProxyFormProps extends ProjectEnvVar, FormType {}

export const ProxyForm: React.FC<ProxyFormProps> = ({
    projectId,
    spiderId,
    envVarsData,
    level,
    type,
    closeModal,
    setParentEnvVars,
}) => {
    const propertiesToFind: Array<string> = [
        "ESTELA_PROXY_URL",
        "ESTELA_PROXY_PORT",
        "ESTELA_PROXY_USER",
        "ESTELA_PROXY_PASS",
        "ESTELA_PROXY_NAME",
    ];

    const [envVars, setEnvVars] = useState<SpiderJobEnvVar[]>(envVarsData);
    const [activeUpdateButton, setActiveUpdateButton] = useState(false);
    // Initialize the state with the filtered envVarsData
    const [proxyEnvVars, setProxyEnvVars] = useState<SpiderJobEnvVar[]>(
        envVarsData.filter((envVar) => propertiesToFind.includes(envVar.name)),
    );
    const mergeArrays = (array1: SpiderJobEnvVar[], array2: SpiderJobEnvVar[]): SpiderJobEnvVar[] => {
        // Create a map to hold the merged values
        const mergedMap = new Map<string, SpiderJobEnvVar>();

        // Add all items from the first array to the map
        array1.forEach((item) => {
            mergedMap.set(item.name, item);
        });

        // Add all items from the second array to the map, updating any that have the same name
        array2.forEach((item) => {
            mergedMap.set(item.name, item); // This will overwrite any existing item with the same name
        });

        // Convert the map values to an array and return
        return Array.from(mergedMap.values());
    };

    // Update proxyEnvVars whenever envVarsData changes
    useEffect(() => {
        const filteredProxyEnvVars = envVarsData.filter((envVar) => propertiesToFind.includes(envVar.name));
        setProxyEnvVars(filteredProxyEnvVars);
        setParentEnvVars(envVars);
    }, [envVars]);

    useEffect(() => {
        if (validProxySettings()) {
            setActiveUpdateButton(true);
        } else {
            setActiveUpdateButton(false);
        }
    }, [proxyEnvVars]);

    const updateProjectEnvVars = (): void => {
        const enableProxies: SpiderJobEnvVar[] = [
            {
                name: "CUSTOM_PROXIES_ENABLED",
                value: "true",
                masked: false,
            },
        ];
        const newEnvVars = mergeArrays(envVars, mergeArrays(proxyEnvVars, enableProxies));
        const requestData: ProjectUpdate = {
            envVars: newEnvVars,
        };
        const request: ApiProjectsUpdateRequest = {
            data: requestData,
            pid: projectId,
        };
        if (projectId === "") {
            setEnvVars(newEnvVars);
            setActiveUpdateButton(true);
            return;
        }
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

    const updateSpiderEnvVars = (): void => {
        const enableProxies: SpiderJobEnvVar[] = [
            {
                name: "CUSTOM_PROXIES_ENABLED",
                value: "true",
                masked: false,
            },
        ];
        const newEnvVars = mergeArrays(envVars, mergeArrays(proxyEnvVars, enableProxies));
        const requestData: SpiderUpdate = {
            envVars: newEnvVars,
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

    const updateEnvVars = (): void => {
        if (level === "project") {
            updateProjectEnvVars();
        } else if (level === "spider") {
            updateSpiderEnvVars();
        }
    };

    const getProxyValue = (envVarName: string): string => {
        const proxyNameObj = envVars.find((obj) => obj.name === envVarName);
        return proxyNameObj ? proxyNameObj.value : "";
    };

    const validProxySettings = (): boolean => {
        console.log({ proxyEnvVars });
        return propertiesToFind.every((property) =>
            proxyEnvVars.some((obj) => obj.name === property && obj.value != ""),
        );
    };

    const handleChangeProxy = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const proxyEnvVar = {
            name: e.target.name,
            value: e.target.value,
            masked: false,
        };
        const nameExists = proxyEnvVars.some((envVar) => envVar.name === proxyEnvVar.name);

        // If the name exists, update the value; otherwise, add the new element
        const updatedProxyEnvVars = nameExists
            ? proxyEnvVars.map((envVar) => (envVar.name === proxyEnvVar.name ? proxyEnvVar : envVar))
            : [...proxyEnvVars, proxyEnvVar];

        setProxyEnvVars(updatedProxyEnvVars);
        //console.log({ proxyEnvVars });
    };

    return (
        <Form layout="vertical">
            <div className="">
                <Form.Item label="Username" name="proxy_username">
                    <Input
                        size="large"
                        placeholder="Username"
                        name="ESTELA_PROXY_USER"
                        defaultValue={getProxyValue("ESTELA_PROXY_USER")}
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
                        defaultValue={getProxyValue("ESTELA_PROXY_PASS")}
                        className="input-proxy-form border-estela placeholder:text-estela-black-low"
                    />
                </Form.Item>
                <Form.Item label="Proxy Address" name="proxy_address">
                    <Input
                        size="large"
                        placeholder="E.g. 10.80.4.176"
                        name="ESTELA_PROXY_URL"
                        defaultValue={getProxyValue("ESTELA_PROXY_URL")}
                        onChange={handleChangeProxy}
                        className="input-proxy-form border-estela placeholder:text-estela-black-low"
                    />
                </Form.Item>
                <Form.Item label="Proxy Port" name="proxy_port">
                    <Input
                        size="large"
                        placeholder="E.g. 8080"
                        name="ESTELA_PROXY_PORT"
                        defaultValue={getProxyValue("ESTELA_PROXY_PORT")}
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
                        defaultValue={getProxyValue("ESTELA_PROXY_NAME")}
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
                    {type}
                </Button>
                <Button
                    block
                    htmlType="submit"
                    onClick={closeModal}
                    className="border-estela hover:border-estela hover:text-estela text-estela rounded-md text-base  min-h-full button-spacing"
                >
                    Cancel
                </Button>
            </div>
        </Form>
    );
};
