import type { AdyenPspDetails } from "./dtos.js";

export async function getPspDetails(psp: string): Promise<AdyenPspDetails | null> {
    const myHeaders = new Headers();
    myHeaders.append("Cookie", process.env.adyenCookie);

    const requestOptions: RequestInit = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };

    const baseUrl = process.env.ADYEN_PSP_URL;
    if (!baseUrl) {
        throw new Error('ADYEN_PSP_URL environment variable is not set');
    }
    const response = await fetch(`${baseUrl}/pspref/${psp}/details`, requestOptions)
        .then((resp) => resp.json() as Promise<AdyenPspDetails>)
        .catch((error) => {
            console.error(error);
            return null;
        });

    console.log("Response", response);
    return response;
}