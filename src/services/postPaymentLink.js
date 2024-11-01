import Swal from "sweetalert2";
import { API_URL } from "./settings";

export default function postPaymentLink(data) {
    const apiURL = `${API_URL}/PaymentLink`;

    return fetch(apiURL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            if (data.paymentLink) {
                Swal.fire({
                    icon: "success",
                    title: "Enlace de pago generado",
                    text: "Redirigiendo a la plataforma de pago..."
                });
                return data;
            } else {
                throw new Error("No se pudo generar el enlace de pago");
            }
        })
        .catch(error => {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo generar el enlace de pago. Intente nuevamente más tarde."
            });
            console.log(error);
            return { error };
        });
}
