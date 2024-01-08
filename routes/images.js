const express = require("express");
const {supabase} = require("../lib/global");
const router = express.Router();

/* Get a logo */
router.get("/logos/:path", async function (req, res, next) {
    const output = await supabase.storage.from('images').download(`/logos/${req.params.path}`);
    if (output.error) {
        if (output.error.message === 'Object not found') {
            res.status(404).json();
        } else if (output.error.status) {
            res.status(output.error.status).json();
        } else {
            res.status(500).json();
        }
    } else {
        const data = await output.data.arrayBuffer();
        res.send(Buffer.from(data));
    }
});

module.exports = router;
