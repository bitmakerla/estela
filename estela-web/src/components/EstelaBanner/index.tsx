import React, { Component } from "react";
import { Space, Typography, Layout } from "antd";

import Bitmaker from "../../assets/logo/bitmaker.svg";
import Estela from "../../assets/icons/estela.svg";

const { Content } = Layout;
const { Text } = Typography;

export class EstelaBanner extends Component<unknown> {
    render() {
        return (
            <Content className="flex h-fit lg:ml-36 sm:h-fit md:h-full lg:h-full m-auto justify-center items-center p-14 sm:p-auto md:p-auto">
                <div>
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
                </div>
            </Content>
        );
    }
}
