import * as service from "./service.js"


export async function assignLicenses(req, res) {
    console.log("Assigning licenses", req.body);

    try {
        const result = await service.assignLicenses(req.body);
        console.log("Result", result);

        res.send(result);
    } catch (err) {
        res.send({
            error: err
        });
        console.log(err)
    }
}