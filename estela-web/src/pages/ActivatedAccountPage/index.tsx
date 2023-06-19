import React, { Component } from "react";
import { Button, Space, Typography, Layout, Row } from "antd";

import history from "../../history";
import { AuthService } from "../../services";
import Bitmaker from "../../assets/logo/bitmaker.svg";
import Estela from "../../assets/icons/estela.svg";

const { Content } = Layout;
const { Text } = Typography;

export class ActivatedAccountPage extends Component<unknown> {
    componentDidMount(): void {
        if (AuthService.getAuthToken()) {
            history.push("/projects");
        }
    }

    render(): JSX.Element {
        return (
            <Content className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <Content className="flex h-fit lg:ml-36 sm:h-fit md:h-full lg:h-full m-auto justify-center items-center p-14 sm:p-auto md:p-auto">
                    <Content>
                        <Estela className="w-48 h-24" />
                        <p className="text-5xl font-bold mt-4">
                            Stable, reliable and <span className="text-estela">open source</span>.
                        </p>
                        <p className="text-3xl font-normal py-6 sm:p-auto">
                            Scrape <span className="text-estela">when you want it</span>.
                        </p>
                        <Space>
                            <Text className="text-sm font-normal">Powered by&nbsp;</Text>
                            <Bitmaker className="w-40 h-40" />
                        </Space>
                    </Content>
                </Content>
                <Content className="flex h-fit lg:mr-36 sm:h-fit md:h-full lg:h-full justify-center items-center p-6 sm:p-auto">
                    <Row justify="center" className="w-96">
                        <Text className="text-3xl font-bold">Account activated!</Text>
                        <Text className="text-center text-lg my-7 text-estela-black-medium">
                            You have successfully activated your account. You can now login.
                        </Text>
                        <Button
                            block
                            className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-10"
                            onClick={() => {
                                history.push("/login");
                            }}
                        >
                            Login
                        </Button>
                    </Row>
                </Content>
            </Content>
        );
    }
}
