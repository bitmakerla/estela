import React, { Component } from "react";
import { Button, Typography, Layout, Row } from "antd";

import history from "../../history";
import { AuthService } from "../../services";
import { EstelaBanner } from "../../components";

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
                <EstelaBanner />
                <Content className="flex h-fit lg:mr-36 sm:h-fit md:h-full lg:h-full justify-center items-center p-6 sm:p-auto">
                    <Row justify="center" className="w-96">
                        <Text className="text-3xl font-bold">Account activated!</Text>
                        <Text className="text-center text-lg my-7 text-estela-black-medium">
                            You have successfully activated your account! <br />
                            You can now log in
                        </Text>
                        <Button
                            block
                            className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-sm h-10"
                            onClick={() => {
                                history.push("/login");
                            }}
                        >
                            Go to login
                        </Button>
                    </Row>
                </Content>
            </Content>
        );
    }
}
