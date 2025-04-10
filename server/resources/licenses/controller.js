import * as service from "./service.js"


export async function createLicense(req, res) {
    console.log("Creating license", req.body);
    const { oldPsp, newPsp } = req.body;

    try {
        const result = await service.createLicense({oldPsp, newPsp});
        console.log("Result", result);

        res.send(result);
    } catch (err) {
        res.send({
            error: err
        });
        console.log(err)
    }
}

export async function getLicenses(req, res) {
    console.log("Getting license", req.params);
    const accountName = req.params['accountName'];

    try {
        const result = await service.getTransactionInformation({ accountName });
        console.log("Result", result);
        res.send(result);
    } catch (err) {
        res.send({
            error: err
        });
        console.log(err)
    }

}