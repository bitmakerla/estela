function completeDateInfo(data: number): string {
    if (data < 10) {
        return `0${data}`;
    }
    return data.toString();
}

export function convertDateToString(date: Date | undefined): string {
    if (date) {
        const yearUTC = date.getUTCFullYear();
        const monthUTC = completeDateInfo(date.getUTCMonth() + 1);
        const dayUTC = completeDateInfo(date.getUTCDate());
        const hourUTC = date.getUTCHours();
        const minutesUTC = completeDateInfo(date.getUTCMinutes());
        const secondsUTC = completeDateInfo(date.getUTCSeconds());
        return `${hourUTC}:${minutesUTC}:${secondsUTC} ${monthUTC}-${dayUTC}-${yearUTC} UTC`;
    }
    return "";
}
