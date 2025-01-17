/* eslint-disable */
import React, { useEffect, useState } from "react";
import {
    Card,
    CardBody,
    CardTitle,
    Table,
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter
} from "reactstrap";
import Swal from "sweetalert2";
import getSingleRequest from "../../services/getSingleRequest";
import getSingleUser from "../../services/getSingleUser";
import putRequest from "../../services/putRequest";
import postRetoma from "../../services/postRetoma";
import postRetomaPayment from "../../services/postRetomaPayment";
import putRequestNotification from "../../services/putRequestNotification";
import postRequestNotification from "../../services/postRequestNotification";
import getSingleEquipment from "../../services/getSingleEquipment";
import putRequestStatus from "../../services/putRequestStatus";
import BreadCrumbsCeluparts from "../../layouts/breadcrumbs/BreadCrumbsCeluparts";
import { Link, useLocation } from "react-router-dom";
import putHomeServiceByIdRequest from "../../services/putHomeServiceByIdRequest";
import postPaymentLink from "../../services/postPaymentLink";

export default function UserRepairRequests() {
    const [userInfo, setUserInfo] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [showButtons, setShowButtons] = useState(true);
    const [loading, setLoading] = useState(false);
    const [currentDeliveryDate, setCurrentDeliveryDate] = useState("");
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [viewDetails, setViewDetails] = useState({
        autoDiagnosis: "",
        deliveryAddress: "",
        deliveryDate: "",
        pickUpAddress: "",
        pickUpDate: ""
    });

    const location = useLocation();

    useEffect(() => {
        if (location.search.includes("payment=success")) {
            Swal.fire({
                icon: "success",
                title: "Pago Exitoso",
                text: "Su pago ha sido procesado exitosamente."
            });
        }
    }, [location.search]);

    useEffect(() => {
        setLoading(true);
        getSingleUser({ id: JSON.parse(localStorage.getItem("user")).idUser })
            .then(response => {
                setUserInfo(response);
                response[0].requests.forEach(tdata => {
                    if (tdata.requestNotifications.length !== 0) {
                        setNotifications(prev => [...prev, tdata.requestNotifications[0]]);
                    }
                });
                setLoading(false);
            })
            .catch(error => {
                console.log(error);
                setLoading(false);
            });
    }, [showButtons]);

    const handleViewDetails = ({
        autoDiagnosis,
        deliveryAddress,
        pickUpAddress,
        homeServices,
        deliveryDate
    }) => {
        setIsOpenModal(!isOpenModal);
        setViewDetails({
            autoDiagnosis,
            deliveryAddress,
            deliveryDate: homeServices[0]?.deliveryDate,
            pickUpAddress,
            pickUpDate: homeServices[0]?.pickUpDate
        });
        setCurrentDeliveryDate(
            homeServices[0]?.deliveryDate != null ? deliveryDate : "Sin definir"
        );
    };

    const addDays = (date, days) => {
        var result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const handleAcceptClick = id => {
        getSingleRequest({ id })
            .then(response => {
                putRequest({
                    idRequest: id,
                    idUser: response[0].idUser,
                    idEquipment: response[0].idEquipment,
                    requestType: response[0].requestType,
                    pickUpAddress: response[0].pickUpAddress,
                    deliveryAddress: response[0].deliveryAddress,
                    statusQuote: "Aceptada",
                    autoDiagnosis: response[0].autoDiagnosis
                })
                    .then(() => setShowButtons(false))
                    .catch(error => console.log(error));
                getSingleEquipment({ id: response[0].idEquipment }).then(response => {
                    postRequestNotification({
                        idRequest: id,
                        message: `El cliente del producto ${response.equipmentBrand} ${response.modelOrReference} aceptó la cuota de reparación.`,
                        wasReviewed: false,
                        notificationType: "to_admin"
                    }).catch(error => console.log(error));

                    postRequestNotification({
                        idRequest: id,
                        message: `El cliente del producto ${response.equipmentBrand} ${response.modelOrReference} aceptó la cuota de reparación.`,
                        wasReviewed: false,
                        notificationType: "to_aux_admin"
                    }).catch(error => console.log(error));
                });
            })
            .catch(error => console.log(error));
        Swal.fire({
            icon: "success",
            title: "Exito!",
            text: "Cotización aceptada!"
        });
    };

    const handleRejectClick = id => {
        Swal.fire({
            title: "¿Desea iniciar una retoma para este producto?",
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: "Sí, iniciar retoma",
            denyButtonText: `No, y rechazar cotización`,
            cancelButtonText: "Cancelar"
        }).then(result => {
            if (result.isConfirmed) {
                getSingleRequest({ id })
                    .then(response => {
                        putRequest({
                            idRequest: id,
                            idUser: response[0].idUser,
                            idEquipment: response[0].idEquipment,
                            requestType: "Retoma",
                            pickUpAddress: response[0].pickUpAddress,
                            deliveryAddress: response[0].deliveryAddress,
                            statusQuote: "Pendiente",
                            autoDiagnosis: response[0].autoDiagnosis
                        })
                            .then(data => {
                                /* --- EMPIEZA NUEVA RETOMA --- */
                                postRetoma({
                                    idRequest: id,
                                    idEquipment: response[0].idEquipment,
                                    retomaQuote: "0",
                                    deviceDiagnostic: ""
                                })
                                    .then(data => {
                                        postRetomaPayment({
                                            idRetoma: data.idRetoma
                                        })
                                            .then(dataRetomaPayment => {
                                                setShowButtons(false);
                                            })
                                            .catch(error => {
                                                console.log(error);
                                            });
                                    })
                                    .catch(error => {
                                        console.log(error);
                                    });
                            })
                            .catch(error => {
                                console.log(error);
                            });
                        putRequestStatus({
                            idRequestStatus: response[0].requestStatus[0].idRequestStatus,
                            idRequest: response[0].requestStatus[0].idRequest,
                            status: "Recibida tecnico",
                            paymentStatus: response[0].requestStatus[0].paymentStatus,
                            productReturned: response[0].requestStatus[0].productReturned,
                            productSold: response[0].requestStatus[0].productSold
                        })
                            .then(putRequestResponse => {
                                console.log(putRequestResponse);
                            })
                            .catch(error => {
                                console.log(error);
                            });
                        getSingleEquipment({ id: response[0].idEquipment })
                            .then(responseE => {
                                /*Notificación al mensajero para decirle que debe devolver el producto
                                                a una determinada direccion*/
                                [notifications.find(tdata => tdata.idRequest === id)].map(
                                    tdata => {
                                        putRequestNotification({
                                            idRequestNotification: tdata.idRequestNotification,
                                            idRequest: id,
                                            message:
                                                "El cliente del producto " +
                                                responseE.equipmentBrand +
                                                " " +
                                                responseE.modelOrReference +
                                                " decidio cambiar reparación por retoma, realizar cotización del producto a vender",
                                            wasReviewed: false,
                                            notificationType: "to_aux_admin"
                                        })
                                            .then(response3 => {
                                                console.log(
                                                    "exito put request notification",
                                                    response3
                                                );
                                            })
                                            .catch(error => {
                                                console.log(error);
                                            });
                                    }
                                );
                            })
                            .catch(error => {
                                console.log(error);
                            });
                    })
                    .catch(error => {
                        console.log(error);
                    });
                Swal.fire("Saved!", "", "success");
            } else if (result.isDenied) {
                getSingleRequest({ id })
                    .then(response => {
                        putRequest({
                            idRequest: id,
                            idUser: response[0]?.idUser,
                            idEquipment: response[0]?.idEquipment,
                            requestType: response[0]?.requestType,
                            pickUpAddress: response[0]?.pickUpAddress,
                            deliveryAddress: response[0]?.deliveryAddress,
                            statusQuote: "Rechazada",
                            autoDiagnosis: response[0]?.autoDiagnosis
                        })
                            .then(response2 => {
                                console.log(response2);
                                getSingleEquipment({ id: response[0].idEquipment })
                                    .then(responseE => {
                                        console.log("get single equipment response", responseE);
                                        /*Notificación al mensajero para decirle que debe devolver el producto
                                                            a una determinada direccion*/
                                        [notifications.find(tdata => tdata.idRequest === id)].map(
                                            tdata => {
                                                putRequestNotification({
                                                    idRequestNotification: tdata.idRequestNotification,
                                                    idRequest: id,
                                                    message:
                                                        "Devolver el producto " +
                                                        responseE.equipmentBrand +
                                                        " " +
                                                        responseE.modelOrReference +
                                                        "a la dirección: " +
                                                        response[0].deliveryAddress +
                                                        " el día: " +
                                                        addDays(new Date(), 1).toLocaleDateString("es", {
                                                            weekday: "long",
                                                            year: "numeric",
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "numeric",
                                                            minute: "numeric"
                                                        }),
                                                    wasReviewed: false,
                                                    notificationType: "to_courier"
                                                })
                                                    .then(response3 => {
                                                        console.log(
                                                            "exito put request notification",
                                                            response3
                                                        );
                                                        putHomeServiceByIdRequest({
                                                            idRequest: tdata.idRequest,
                                                            deliveryDate: addDays(new Date(), 1)
                                                        });
                                                    })
                                                    .catch(error => {
                                                        console.log(error);
                                                    });
                                            }
                                        );
                                    })
                                    .catch(error => {
                                        console.log(error);
                                    });
                                setShowButtons(false);
                            })
                            .catch(error => {
                                console.log(error);
                            });
                        putRequestStatus({
                            idRequestStatus: response[0].requestStatus[0].idRequestStatus,
                            idRequest: response[0].requestStatus[0].idRequest,
                            status: "En devolucion",
                            paymentStatus: response[0].requestStatus[0].paymentStatus,
                            productReturned: response[0].requestStatus[0].productReturned,
                            productSold: response[0].requestStatus[0].productSold
                        })
                            .then(responseRequestStatus => {
                                console.log(responseRequestStatus);
                            })
                            .catch(error => {
                                console.log(error);
                            })
                            .finally(finalPutRequest => {
                                Swal.fire(
                                    "Cotización rechazada, tu producto será devuelto en las siguientes 24 horas",
                                    "",
                                    "info"
                                );
                            });
                    })
                    .catch(error => {
                        console.log(error);
                    })
                    .finally(final => {
                        Swal.fire(
                            "Cotización rechazada, tu producto será devuelto en las siguientes 24 horas",
                            "",
                            "info"
                        );
                    });
            }
        });
    };

    const handlePayment = async (idRequest, repairQuote) => {
        const requestData = {
            Amount: repairQuote * 100,
            CustomerEmail: "user@example.com",
            Reference: `repair-${idRequest}`
        };

        try {
            const response = await postPaymentLink(requestData);
            window.location.href = response.paymentLink;
        } catch (error) {
            console.log("Error al generar el enlace de pago", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo generar el enlace de pago."
            });
        }
    };

    return loading ? (
        <div>Loading...</div>
    ) : (
        <div>
            <BreadCrumbsCeluparts breadcrumbName="Solicitudes de reparación" />
            <Card>
                <CardBody>
                    <CardTitle tag="h5">Solicitudes de reparación</CardTitle>
                    <Table className="no-wrap mt-3 align-middle" responsive>
                        <thead>
                            <tr>
                                <th>Marca referencia</th>
                                <th>Estado de la solicitud</th>
                                <th>Valor de la Reparación</th>
                                <th>Estado Cotización</th>
                                <th>Fecha de entrega</th>
                                <th>Número de teléfono</th>
                                <th>Ver detalles</th>
                                <th>Ver historial de solicitud</th>
                                <th>Pagar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userInfo[0]?.requests.map((tdata, index) =>
                                tdata.requestType === "Reparacion" ? (
                                    <tr key={index} className="border-top">
                                        <td>
                                            {tdata.equipment?.equipmentBrand}{" "}
                                            {tdata.equipment?.modelOrReference}
                                        </td>
                                        <td>{tdata.requestStatus[0]?.status || "Sin estado"}</td>
                                        <td>
                                            {tdata.repairs[0]?.repairQuote === "0" &&
                                                !tdata.repairs[0]?.priceReviewedByAdmin
                                                ? "Pendiente"
                                                : tdata.repairs[0]?.repairQuote || "No definido"}
                                        </td>
                                        <td>
                                            {tdata.statusQuote === "Pendiente" &&
                                                tdata.repairs[0]?.priceReviewedByAdmin &&
                                                showButtons ? (
                                                <div className="text-danger">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAcceptClick(tdata.idRequest)}
                                                        className="btn btn-primary"
                                                    >
                                                        Aceptar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRejectClick(tdata.idRequest)}
                                                        className="btn btn-danger"
                                                    >
                                                        Rechazar
                                                    </button>
                                                </div>
                                            ) : (
                                                <i>{tdata.statusQuote}</i>
                                            )}
                                        </td>
                                        <td>
                                            {tdata.homeServices[0]?.deliveryDate
                                                ? new Date(tdata.requestDate).toLocaleDateString("es")
                                                : "Fecha sin definir"}
                                        </td>
                                        <td>{tdata.phone || "No disponible"}</td>
                                        <td>
                                            <Button
                                                color="info"
                                                onClick={() => handleViewDetails(tdata)}
                                            >
                                                Detalles
                                            </Button>
                                        </td>
                                        <td>
                                            <Link to={`/home/request-history-table/${tdata.idRequest}`}>
                                                <Button color="primary">Ver</Button>
                                            </Link>
                                        </td>
                                        <td>
                                            <Button
                                                color="success"
                                                onClick={() => handlePayment(tdata.idRequest, tdata.repairs[0]?.repairQuote)}
                                                disabled={!tdata.repairs[0] || tdata.repairs[0].repairQuote === "0"}
                                            >
                                                Pagar
                                            </Button>
                                        </td>
                                    </tr>
                                ) : null
                            )}
                        </tbody>
                    </Table>

                    <Modal isOpen={isOpenModal} toggle={() => setIsOpenModal(!isOpenModal)}>
                        <ModalHeader toggle={() => setIsOpenModal(!isOpenModal)}>
                            Detalles de la solicitud
                        </ModalHeader>
                        <ModalBody>
                            <div>
                                <span className="fw-bold">Falla reportada:</span>
                            </div>
                            {viewDetails.autoDiagnosis || "No especificada"}
                            <hr />
                            <div>
                                <span className="fw-bold">Dirección de recogida:</span>
                            </div>
                            {viewDetails.pickUpAddress || "No especificada"}
                            <hr />
                            <div>
                                <span className="fw-bold">Fecha de recogida:</span>
                            </div>
                            {viewDetails.pickUpDate
                                ? new Date(viewDetails.pickUpDate).toLocaleDateString("es")
                                : "No definida"}
                            <hr />
                            <div>
                                <span className="fw-bold">Dirección de entrega:</span>
                            </div>
                            {viewDetails.deliveryAddress || "No especificada"}
                            <hr />
                            <div>
                                <span className="fw-bold">Fecha de entrega:</span>
                            </div>
                            {currentDeliveryDate !== "Sin definir"
                                ? new Date(viewDetails.deliveryDate).toLocaleDateString("es")
                                : "Sin definir"}
                        </ModalBody>
                        <ModalFooter>
                            <Button color="secondary" onClick={() => setIsOpenModal(!isOpenModal)}>
                                Cerrar
                            </Button>
                        </ModalFooter>
                    </Modal>
                </CardBody>
            </Card>
        </div>
    );
}
