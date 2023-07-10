import { createContext } from "react";

export type RegistrationContextProps = {
    validated: boolean;
    updateValidated: (value: boolean) => void;
};

export const RegistrationContext = createContext<RegistrationContextProps>({} as RegistrationContextProps);
