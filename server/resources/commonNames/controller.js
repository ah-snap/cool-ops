import * as service from "./service.js";

export async function getCommonNameInfo(req, res) {
    const commonNameOrMac = req.params['commonNameOrMac'];

    try {
        const result = await service.getCommonNameInfo({ commonNameOrMac });
        console.log("Result", result);
        if (result.length === 0) {
            res.send({
                error: "No results found"
            });
            return;
        }

        res.send(result);
    } catch (err) {
        res.send({
            error: err
        });
        console.log(err)
    }
}

