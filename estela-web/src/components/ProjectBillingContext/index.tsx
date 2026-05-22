import React from "react";
import { Typography } from "antd";
import { BillingService, CreditsWallet, formatWalletBalance } from "../../services/billing.service";

const { Text } = Typography;

interface ProjectBillingContextProps {
    isOwner: boolean;
    ownerUsername?: string;
    wallet?: CreditsWallet | null;
}

export const ProjectBillingContext: React.FC<ProjectBillingContextProps> = ({ isOwner, ownerUsername, wallet }) => {
    if (isOwner && wallet) {
        return (
            <Text className="text-sm text-estela-black-medium whitespace-nowrap">
                Your balance: {formatWalletBalance(wallet.balance_cents, wallet.currency)}
            </Text>
        );
    }

    if (!isOwner && ownerUsername) {
        return (
            <Text className="text-sm text-estela-black-medium whitespace-nowrap">
                This project is billed to @{ownerUsername}
            </Text>
        );
    }

    return null;
};

interface ProjectBillingContextLoaderProps {
    projectLoaded: boolean;
    isOwner: boolean;
    ownerUsername?: string;
    currentUsername: string;
}

interface ProjectBillingContextLoaderState {
    wallet?: CreditsWallet | null;
    loaded: boolean;
}

export class ProjectBillingContextLoader extends React.Component<
    ProjectBillingContextLoaderProps,
    ProjectBillingContextLoaderState
> {
    state: ProjectBillingContextLoaderState = {
        loaded: false,
    };

    mounted = true;

    async componentDidMount(): Promise<void> {
        await this.loadWallet();
    }

    async componentDidUpdate(prevProps: ProjectBillingContextLoaderProps): Promise<void> {
        if (prevProps.isOwner !== this.props.isOwner || prevProps.currentUsername !== this.props.currentUsername) {
            await this.loadWallet();
        }
    }

    componentWillUnmount(): void {
        this.mounted = false;
    }

    loadWallet = async (): Promise<void> => {
        if (!this.props.isOwner) {
            if (this.mounted) {
                this.setState({ loaded: true, wallet: undefined });
            }
            return;
        }

        const user = await BillingService.fetchUser(this.props.currentUsername);
        if (!this.mounted) {
            return;
        }
        this.setState({
            wallet: user?.credits_wallet ?? null,
            loaded: true,
        });
    };

    render(): React.ReactNode {
        if (!this.props.projectLoaded || !this.state.loaded) {
            return null;
        }

        return (
            <ProjectBillingContext
                isOwner={this.props.isOwner}
                ownerUsername={this.props.ownerUsername}
                wallet={this.state.wallet}
            />
        );
    }
}
