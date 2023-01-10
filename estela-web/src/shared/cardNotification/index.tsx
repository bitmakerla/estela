import React, { Component } from "react";
import { Col, Row, Layout, Modal, Typography, Image, Space, Button } from "antd";

import "./styles.scss";
import history from "../../history";

const { Text } = Typography;
const { Content } = Layout;

interface IState {
    open: boolean;
}

export class CardNotification extends Component<IState> {
    openModal: boolean = this.props.open;
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
                onCancel={() => this.setState({ modal: false })}
                footer={null}
            >
                <Content>
                    <Row className="m-2">
                        <Text className="font-bold text-3xl text-estela-blue-full">ADD A CARD TO RUN JOBS</Text>
                    </Row>
                    <Row className="grid grid-cols-5 m-2">
                        <Space direction="vertical" className="col-span-3">
                            <Text className="text-2xl font-medium">One suscription,</Text>
                            <Text className="text-2xl font-medium">unlimited resources,</Text>
                        </Space>
                        <Col className="col-span-2 my-auto">
                            <Image width={200} src="../../assets/images/cloud-storage.png" />
                        </Col>
                    </Row>
                    <Row className="m-2">
                        <Button
                            size="large"
                            className="bg-estela-blue-full text-white border-estela-blue-full hover:bg-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-md"
                            onClick={() => history.push(`/projects`)}
                        >
                            Add card now
                        </Button>
                    </Row>
                </Content>
            </Modal>
        );
    }
}
