import { API_URL } from "./settings";

export default function getRequestNotificationToCourier() {
    const apiURL = `${API_URL}/RequestNotification/Courier`;

    return fetch(apiURL)
        .then(response => response.json())
        .then((response) => {
            return response;
        })
        .catch(error => {
            console.log(error)
        })
}
