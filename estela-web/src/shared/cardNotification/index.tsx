import React, { Component } from "react";
import { Col, Row, Layout, Modal, Typography, Space, Button } from "antd";

import CloudStorage from "../../assets/images/cloud-storage.svg";
import "./styles.scss";
import history from "../../history";

const { Text } = Typography;
const { Content } = Layout;

interface IState {
    open: boolean;
    setOpen: (modalValue: boolean) => void;
}

export class CardNotification extends Component<IState> {
    openModal: boolean = this.props.open;
    setOpenModal = this.props.setOpen;

    render(): JSX.Element {
        return (
            <Modal
                style={{
                    overflow: "hidden",
                    padding: 0,
                }}
                centered
                width={600}
                open={this.openModal}
                onCancel={() => this.setOpenModal(false)}
                footer={null}
            >
                <Content className="p-2">
                    <Row className="m-2">
                        <Text className="font-bold text-3xl text-estela-blue-full">GET A GIFT OF $50!</Text>
                    </Row>
                    <Row className="grid grid-cols-7 m-2 content-center">
                        <Space direction="vertical" className="col-span-4">
                            <Text className="text-3xl font-medium">
                                <span className="text-estela-blue-full">One</span> suscription,
                            </Text>
                            <Text className="text-3xl font-medium">
                                <span className="text-estela-blue-full">unlimited</span> resources,
                            </Text>
                            <Text className="text-lg">
                                Unlimited{" "}
                                <span className="text-estela-blue-full">
                                    bandwidth, processing time and storage retention
                                </span>
                                , subscribe and pay when your free $50, run out.
                            </Text>
                            <Text className="text-sm font-bold">
                                ¡Add your card and start deploying spiders and jobs!
                            </Text>
                        </Space>
                        <Col className="col-span-3 my-auto">
                            <CloudStorage className="w-64 h-64" />
                        </Col>
                    </Row>
                    <Row className="m-2">
                        <Button
                            size="large"
                            className="w-72 bg-estela-blue-full text-white border-estela-blue-full hover:bg-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-md"
                            onClick={() => history.push(`/projects`)}
                        >
                            Subscribe now
                        </Button>
                    </Row>
                </Content>
            </Modal>
        );
    }
}
